import time
import json
import os
import logging
from kafka import KafkaProducer
from obspy import UTCDateTime
from obspy.clients.fdsn import Client

logger = logging.getLogger("backend.kafka.producer")

TOPIC_NAME = "Sensor"
LOCATION = "*"
CHANNEL = "HH*"
WINDOW_DURATION = 1

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755")
SSL_CA = os.environ.get("KAFKA_SSL_CAFILE", os.path.join(BASE_DIR, "ca.pem"))
SSL_CERT = os.environ.get("KAFKA_SSL_CERTFILE", os.path.join(BASE_DIR, "service.cert"))
SSL_KEY = os.environ.get("KAFKA_SSL_KEYFILE", os.path.join(BASE_DIR, "service.key"))


def _create_producer():
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        security_protocol="SSL",
        ssl_cafile=SSL_CA,
        ssl_certfile=SSL_CERT,
        ssl_keyfile=SSL_KEY,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        retries=5,
    )


def discover_stations(client):
    inv = client.get_stations(network="*", station="*", channel="HH*", level="station")
    stations = []
    for net in inv:
        for sta in net:
            stations.append((net.code, sta.code))
    logger.info(f"Discovered {len(stations)} stations")
    return stations


def fetch_and_send():
    logger.info("Producer starting, connecting to IRIS and Kafka...")
    client = Client("IRIS")
    producer = _create_producer()
    logger.info("Kafka producer connected.")
    stations = discover_stations(client)
    starttime = UTCDateTime.utcnow() - WINDOW_DURATION

    while True:
        try:
            endtime = starttime + WINDOW_DURATION

            for net, sta in stations:
                try:
                    st = client.get_waveforms(
                        network=net,
                        station=sta,
                        location=LOCATION,
                        channel=CHANNEL,
                        starttime=starttime,
                        endtime=endtime,
                    )

                    st.merge(method=1, fill_value="interpolate")

                    for tr in st:
                        stats = tr.stats

                        payload = {
                            "network": stats.network,
                            "station": stats.station,
                            "location": stats.location,
                            "channel": stats.channel,
                            "starttime": str(stats.starttime),
                            "endtime": str(stats.endtime),
                            "sampling_rate": stats.sampling_rate,
                            "samples": tr.data.tolist(),
                        }

                        producer.send(TOPIC_NAME, payload)

                except Exception as e:
                    logger.warning(f"Skipping {net}.{sta}: {e}")

            producer.flush()

            logger.info(f"Sent window: {starttime} -> {endtime}")
            starttime = endtime

        except Exception as e:
            logger.error(f"Producer error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    fetch_and_send()
