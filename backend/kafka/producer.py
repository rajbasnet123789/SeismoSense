import time
import json
from kafka import KafkaProducer
from obspy import UTCDateTime
from obspy.clients.fdsn import Client


TOPIC_NAME = "Sensor"
LOCATION = "*"
CHANNEL = "HH*"
WINDOW_DURATION = 1
producer = KafkaProducer(
    bootstrap_servers="kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755",
    security_protocol="SSL",
    ssl_cafile="ca.pem",
    ssl_certfile="service.cert",
    ssl_keyfile="service.key",
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    retries=5,
)

client = Client("IRIS")


def discover_stations():
    inv = client.get_stations(network="*", station="*", channel="HH*", level="station")
    stations = []
    for net in inv:
        for sta in net:
            stations.append((net.code, sta.code))
    print(f"Discovered {len(stations)} stations")
    return stations


def fetch_and_send():
    stations = discover_stations()
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
                    print(f"Skipping {net}.{sta}: {e}")

            producer.flush()

            print(f"Sent window: {starttime} → {endtime}")
            starttime = endtime

        except Exception as e:
            print(f"Producer error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    fetch_and_send()
