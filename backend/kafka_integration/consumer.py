import numpy as np
import tensorflow as tf
from kafka import KafkaConsumer
import json
import os
import sys
import logging
from datetime import datetime, timezone

logger = logging.getLogger("backend.kafka_integration.consumer")

# Ensure workspace root is in sys.path to allow backend imports when run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.base import SessionLocal
from backend.db.model import StreamData
from backend.ws_manager import manager
from backend.stations_config import STATION_CODES

TOPIC_NAME = "Sensor"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    os.path.join(BASE_DIR, "..", "ai", "earthquake_model.tflite"),
)
TARGET_SAMPLES = 500

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755")
SSL_CA = os.environ.get("KAFKA_SSL_CAFILE", os.path.join(BASE_DIR, "ca.pem"))
SSL_CERT = os.environ.get("KAFKA_SSL_CERTFILE", os.path.join(BASE_DIR, "service.cert"))
SSL_KEY = os.environ.get("KAFKA_SSL_KEYFILE", os.path.join(BASE_DIR, "service.key"))


def _create_consumer():
    return KafkaConsumer(
        TOPIC_NAME,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id="CONSUMER_GROUP_ID_V2",
        client_id="CONSUMER_CLIENT_ID",
        security_protocol="SSL",
        ssl_cafile=SSL_CA,
        ssl_certfile=SSL_CERT,
        ssl_keyfile=SSL_KEY,
        auto_offset_reset="latest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8"))
    )

def load_model():
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    print("Expected input shape:", interpreter.get_input_details()[0]["shape"])
    return interpreter

def fix_length(data):
    data = np.array(data)
    if len(data) > TARGET_SAMPLES:
        return data[:TARGET_SAMPLES]
    elif len(data) < TARGET_SAMPLES:
        pad_width = TARGET_SAMPLES - len(data)
        return np.pad(data, (0, pad_width), mode='constant')
    return data

def z_score_standardize(data):
    mean = np.mean(data, axis=1, keepdims=True)
    std = np.std(data, axis=1, keepdims=True)
    return (data - mean) / (std + 1e-8)

def predict(interpreter, data):
    input_index = interpreter.get_input_details()[0]["index"]
    output_index = interpreter.get_output_details()[0]["index"]
    interpreter.set_tensor(input_index, data)
    interpreter.invoke()
    return interpreter.get_tensor(output_index)

active_consumer = None

def close_consumer():
    global active_consumer
    if active_consumer:
        try:
            active_consumer.close()
        except Exception:
            pass

def consume(stop_event=None):
    global active_consumer
    logger.info("Consumer starting, loading model...")
    interpreter = load_model()
    consumer = _create_consumer()
    active_consumer = consumer
    logger.info("Kafka consumer connected.")
    station_components = {}

    for message in consumer:
        if stop_event and stop_event.is_set():
            break
        try:
            msg = message.value
            station=msg["station"]
            channel = msg["channel"]
            samples = msg["samples"]

            if station not in STATION_CODES:
                continue

            print(f"Received {channel} with {len(samples)} samples")

            if station not in station_components:
                station_components[station] = {"Z": None, "N": None, "E": None}

            comps = station_components[station]

            if channel.endswith("Z"):
                comps["Z"] = fix_length(samples)
            elif channel.endswith("N"):
                comps["N"] = fix_length(samples)
            elif channel.endswith("E"):
                comps["E"] = fix_length(samples)

            if any(v is None for v in comps.values()):
                continue

            data = np.stack([comps["Z"], comps["N"], comps["E"]], axis=-1)
            data = np.expand_dims(data, axis=0).astype(np.float32)
            data = z_score_standardize(data)

            p = predict(interpreter, data)
            p_wave_prob = float(p[0][0])
            
            # Save prediction + raw samples to PostgreSQL
            db_session = SessionLocal()
            try:
                db_data = StreamData(
                    station=station,
                    p_wave=p_wave_prob,
                    z_samples=json.dumps(comps["Z"].tolist()),
                    n_samples=json.dumps(comps["N"].tolist()),
                    e_samples=json.dumps(comps["E"].tolist()),
                    created_at=datetime.now(timezone.utc)
                )
                db_session.add(db_data)
                db_session.commit()
                db_session.refresh(db_data)
                print(f"Saved to DB - Station: {station}, P-wave probability: {p_wave_prob:.4f}")

                payload = {
                    "type": "prediction",
                    "data": {
                        "id": db_data.id,
                        "station": station,
                        "network": msg.get("network", "IN"),
                        "p_wave": p_wave_prob,
                        "z_samples": comps["Z"].tolist(),
                        "n_samples": comps["N"].tolist(),
                        "e_samples": comps["E"].tolist(),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                }

                # In-process broadcast when consumer runs in the same process as FastAPI
                if manager.loop:
                    manager.broadcast_sync(payload)
                else:
                    try:
                        import urllib.request
                        backend_url = os.environ.get("BACKEND_API_URL", "http://localhost:8000")
                        req = urllib.request.Request(
                            f"{backend_url}/broadcast",
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Content-Type": "application/json"},
                        )
                        with urllib.request.urlopen(req, timeout=2.0) as resp:
                            resp.read()
                    except Exception as broadcast_err:
                        print(f"Failed to post WebSocket broadcast to backend: {broadcast_err}")
            except Exception as db_err:
                db_session.rollback()
                print(f"Failed to save prediction to database: {db_err}")
            finally:
                db_session.close()

            del station_components[station]

        except Exception as e:
            print(f"Consumer error: {e}")

if __name__ == "__main__":
    consume()
   