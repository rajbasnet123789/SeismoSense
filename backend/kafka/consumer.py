import numpy as np
import tensorflow as tf
from kafka import KafkaConsumer
import json
import os
import sys

# Ensure workspace root is in sys.path to allow backend imports when run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.base import SessionLocal
from backend.db.model import StreamData

TOPIC_NAME = "Sensor"
MODEL_PATH = r"D:\Project_E\backend\ai\earthquake_model.tflite"
TARGET_SAMPLES = 500

consumer = KafkaConsumer(
    TOPIC_NAME,
    bootstrap_servers="kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755",
    group_id="CONSUMER_GROUP_ID_V2",
    client_id="CONSUMER_CLIENT_ID",
    security_protocol="SSL",
    ssl_cafile="ca.pem",
    ssl_certfile="service.cert",
    ssl_keyfile="service.key",
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

def consume():
    print("Consumer started...")
    interpreter = load_model()
    components = {"Z": None, "N": None, "E": None}

    for message in consumer:
        try:
            msg = message.value
            station=msg["station"]
            channel = msg["channel"]
            samples = msg["samples"]
            print(f"Received {channel} with {len(samples)} samples")

            if channel.endswith("Z"):
                components["Z"] = fix_length(samples)
            elif channel.endswith("N"):
                components["N"] = fix_length(samples)
            elif channel.endswith("E"):
                components["E"] = fix_length(samples)

            if any(v is None for v in components.values()):
                continue

            data = np.stack([components["Z"], components["N"], components["E"]], axis=-1)
            data = np.expand_dims(data, axis=0).astype(np.float32)
            data = z_score_standardize(data)

            p = predict(interpreter, data)
            p_wave_prob = float(p[0][0])
            
            # Save prediction to PostgreSQL
            db_session = SessionLocal()
            try:
                db_data = StreamData(
                    station=station,
                    p_wave=p_wave_prob
                )
                db_session.add(db_data)
                db_session.commit()
                db_session.refresh(db_data)
                print(f"Saved to DB - Station: {station}, P-wave probability: {p_wave_prob:.4f}")
            except Exception as db_err:
                db_session.rollback()
                print(f"Failed to save prediction to database: {db_err}")
            finally:
                db_session.close()

            components = {"Z": None, "N": None, "E": None}

        except Exception as e:
            print(f"Consumer error: {e}")

if __name__ == "__main__":
    consume()   