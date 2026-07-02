import asyncio
import json
import logging
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger("backend.ws_manager")

class ConnectionManager:
    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self.loop = None

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.add(ws)
        logger.info(f"WebSocket connected. Total: {len(self.connections)}")

    def disconnect(self, ws: WebSocket):
        self.connections.discard(ws)
        logger.info(f"WebSocket disconnected. Total: {len(self.connections)}")

    async def broadcast(self, message: dict):
        dead = set()
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Removing dead WebSocket: {e}")
                dead.add(ws)
        for ws in dead:
            self.connections.discard(ws)

    def broadcast_sync(self, message: dict):
        if self.loop and self.connections:
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)

manager = ConnectionManager()
