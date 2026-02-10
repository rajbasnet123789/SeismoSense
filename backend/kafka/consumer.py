import io
import numpy as np
import tensorflow as tf
from kafka import KafkaConsumer
from obspy import read

TOPIC_NAME = "Sensor"
MODEL_PATH = r"D:\Project_E\backend\ai\earthquake_model.tflite"
TARGET_SAMPLES = 500

consumer = KafkaConsumer(
    TOPIC_NAME,
    bootstrap_servers="kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755",
    group_id="CONSUMER_GROUP_ID",
    client_id="CONSUMER_CLIENT_ID",
    security_protocol="SSL",
    ssl_cafile="ca.pem",
    ssl_certfile="service.cert",
    ssl_keyfile="service.key",
    auto_offset_reset="latest",
)

def deserialize_stream(data: bytes):
    with io.BytesIO(data) as buf:
        return read(buf, format="MSEED")

def load_model():
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    print("Expected input shape:", interpreter.get_input_details()[0]["shape"])
    return interpreter

def extract_components(stream):
    try:
        z = stream.select(channel="*Z")[0].data
        n = stream.select(channel="*N")[0].data
        e = stream.select(channel="*E")[0].data
        return z, n, e
    except Exception:
        return None

def fix_length(x, target=TARGET_SAMPLES):
    """Pad or truncate to exact length"""
    if len(x) > target:
        return x[:target]
    if len(x) < target:
        return np.pad(x, (0, target - len(x)))
    return x

def predict(interpreter, data):
    input_index = interpreter.get_input_details()[0]["index"]
    output_index = interpreter.get_output_details()[0]["index"]

    interpreter.set_tensor(input_index, data)
    interpreter.invoke()
    return interpreter.get_tensor(output_index)

def consume():
    print("Consumer started...")
    interpreter = load_model()

    for message in consumer:
        try:
            stream = deserialize_stream(message.value)
            components = extract_components(stream)

            if components is None:
                print("Missing Z/N/E components")
                continue

            z, n, e = components

            z = fix_length(z)
            n = fix_length(n)
            e = fix_length(e)

            data = np.stack([z, n, e], axis=-1)  # (500, 3)
            data = np.expand_dims(data, axis=0).astype(np.float32)  # (1, 500, 3)

            p = predict(interpreter, data)
            print(f"P-wave probability: {float(p[0][0]):.4f}")

        except Exception as e:
            print(f"Consumer error: {e}")

if __name__ == "__main__":
    consume()
