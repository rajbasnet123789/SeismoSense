import io
import time
from kafka import KafkaProducer
from obspy import UTCDateTime, Stream
from obspy.clients.fdsn import Client

TOPIC_NAME = "Sensor"
TARGET_SAMPLES = 500

producer = KafkaProducer(
    bootstrap_servers="kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755",
    security_protocol="SSL",
    ssl_cafile="ca.pem",
    ssl_certfile="service.cert",
    ssl_keyfile="service.key",
)

client = Client("IRIS")

def serialize_stream(stream: Stream) -> bytes:
    with io.BytesIO() as buf:
        stream.write(buf, format="MSEED")
        return buf.getvalue()

def fetch_and_send():
    starttime = UTCDateTime.utcnow() - 10
    window = 5  

    while True:
        try:
            endtime = starttime + window

            st = client.get_waveforms(
                network="IN",
                station="*",
                location="*",
                channel="HH?",
                starttime=starttime,
                endtime=endtime,
            )

            st.merge(method=1, fill_value="interpolate")

            if min(len(tr.data) for tr in st) < TARGET_SAMPLES:
                print("Not enough samples, skipping window")
                starttime = endtime
                continue

            data = serialize_stream(st)
            producer.send(TOPIC_NAME, data)
            producer.flush()

            print(f"Sent window {starttime} → {endtime}")

            starttime = endtime
            time.sleep(window)

        except Exception as e:
            print(f"Producer error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    fetch_and_send()
