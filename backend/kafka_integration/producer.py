import os
import json
import time
import logging
from dotenv import load_dotenv
from kafka import KafkaProducer
from obspy import UTCDateTime
from obspy.clients.fdsn import Client

# Load environment variables
load_dotenv()

# Configure logging to output to console
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend.kafka_integration.producer")

# Configuration Constants
TOPIC_NAME = "Sensor"
LOCATION = "*"
CHANNEL = "HH*"
WINDOW_DURATION = 1.0  # Time window step size in seconds
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Kafka Connection Endpoints
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755")
SSL_CA = os.environ.get("KAFKA_SSL_CAFILE", os.path.join(BASE_DIR, "ca.pem"))
SSL_CERT = os.environ.get("KAFKA_SSL_CERTFILE", os.path.join(BASE_DIR, "service.cert"))
SSL_KEY = os.environ.get("KAFKA_SSL_KEYFILE", os.path.join(BASE_DIR, "service.key"))

def _create_producer():
    """Initializes and returns a secure Apache Kafka producer client."""
    logger.info(f"Targeting Bootstrap Server: {KAFKA_BOOTSTRAP}")
    return KafkaProducer(
        bootstrap_servers=[KAFKA_BOOTSTRAP],
        security_protocol="SSL",
        ssl_cafile=SSL_CA,
        ssl_certfile=SSL_CERT,
        ssl_keyfile=SSL_KEY,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        retries=5,
        api_version=(2, 4, 0),
        acks='all'
    )

active_producer = None

def close_producer():
    global active_producer
    if active_producer:
        try:
            active_producer.close()
        except Exception:
            pass

def fetch_and_send(stop_event=None):
    """Fetches seismic waveform data in bulk steps and streams it to Kafka."""
    global active_producer
    logger.info("Producer starting, connecting to EarthScope FDSN Client and Kafka Broker...")
    client = Client("EARTHSCOPE")
    producer = _create_producer()
    active_producer = producer
    logger.info("Kafka producer connected successfully.")

    # Initialize timing window looking back 2 seconds to avoid real-time generation delays on server
    starttime = UTCDateTime.utcnow() - 2.0

    while not (stop_event and stop_event.is_set()):
        try:
            endtime = starttime + WINDOW_DURATION
            now = UTCDateTime.utcnow()

            # Pacing: Avoid requesting future timestamps by waiting until the window completes
            if endtime > now:
                sleep_time = endtime - now
                if stop_event and stop_event.wait(sleep_time):
                    break
                elif not stop_event:
                    time.sleep(sleep_time)

            logger.info(f"Requesting bulk waveform data: {starttime} -> {endtime}")

            # Request target streams from stable GSN stations
            st = client.get_waveforms(
                network="IN",
                station="SHL,MNC",
                location=LOCATION,
                channel=CHANNEL,
                starttime=starttime,
                endtime=endtime,
            )

            if len(st) == 0:
                logger.warning("Zero trace segments returned by server for this time frame.")
                starttime = endtime
                continue

            # Merge matching stream gaps using linear data interpolation 
            st.merge(method=1, fill_value="interpolate")

            # Iterate over each trace channel response object and compile JSON records
            sent_count = 0
            for tr in st:
                if stop_event and stop_event.is_set():
                    break
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
                sent_count += 1

            # Ensure all internal thread message batches are written to the cluster safely
            producer.flush()
            logger.info(f"Streamed {sent_count} clean sensor traces successfully to topic: '{TOPIC_NAME}'.")
            
            # Step our collection timeline forward into the future
            starttime = endtime

        except Exception as e:
            logger.error(f"Error encountered during stream lifecycle cycle: {e}")
            # If server connection fails or windows drop, wait briefly and reset baseline to current clock time
            if stop_event and stop_event.wait(2.0):
                break
            elif not stop_event:
                time.sleep(2.0)
            starttime = UTCDateTime.utcnow() - WINDOW_DURATION

if __name__ == "__main__":
    fetch_and_send()

