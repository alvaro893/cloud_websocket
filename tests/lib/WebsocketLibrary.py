#!/usr/bin/python
import subprocess
import sys
from Queue import Queue, Empty
from threading import Thread
import websocket
from robot.api import logger

__version__ = '0.1'
__author__ = "Alvaro Bolanos Rodriguez"


class WebsocketLibrary:
    ROBOT_LIBRARY_SCOPE = 'TEST CASE'
    ROBOT_LISTENER_API_VERSION = 2

    def __init__(self):
        self.ROBOT_LIBRARY_LISTENER = self
        # self.url = "%s:%d" % (host, port)
        self.socketDic = {}

    def _start_suite(self, name, attrs):
        print 'started suite'

    def _end_suite(self, name, attrs):
        print 'Suite %s (%s) ending.' % (name, attrs['id'])

    def _start_test(self, name, attrs):
        pass
    def _end_test(self, name, attrs):
        self.stop_all_sockets()

    def _get_socket(self, name):
        try:
            return self.socketDic.get(name)
        except Exception as e:
            logger.error(e.message)

        raise Exception("%s socket not found in list" % name)

    def create_socket(self, name, uri):
        ws = self.WebSocketConnection(uri, name=name)
        self.socketDic[name] = ws
        logger.info("created %s using %s" % (name, uri))

    def do_exist_socket(self, name):
        if self.socketDic.has_key(name):
            logger.info("'%s' exists" % name)
        else:
            raise AssertionError("'%s' does not exist" % name)
    
    def close_socket(self,name):
        s = self._get_socket(name)
        s.stop()

    def send_from_socket(self, socket, message):
        try:
            s = self._get_socket(socket)
            s.send_to_socket(message)
            logger.info("%s is sending '%s' message" % (s.name, message) )
        except websocket.WebSocketConnectionClosedException as e:
            logger.warn(e.message + ".Try using 'Wait to' keyword style")

    def stop_all_sockets(self):
        for name, socket in self.socketDic.items():
            socket.stop()
        self.socketDic = {}

    def receive_next_message(self, name, expected):
        ws = self._get_socket(name)
        try:
            received_message = ws.receive_next_message()
        except Empty as e:
            msg = e.message+"Message is not in Queue yet"
            logger.warn(msg)
            raise AssertionError(msg)
        if not ws:
            raise AssertionError("there is no websocket")
        if not received_message == expected:
            msg = "Messages do not match:'%s' is not '%s'" % (received_message, expected)
            logger.warn(msg)
            raise AssertionError(msg)

    def messages_in_queue_should_be(self, name, n):
        expected = int(n)
        s = self._get_socket(name)
        actual = s.in_queue.qsize()
        if actual != expected:
            raise AssertionError("number of elements does not match, was %d, expected %d" % (actual, expected))


    class WebSocketConnection(Thread):
        def __init__(self, url, name):
            Thread.__init__(self, name=name)
            # websocket.enableTrace(True)
            self.url = url
            self.name = name
            self.in_queue = Queue(10)
            self.ws = websocket.WebSocketApp(self.url,
                                             on_message=self.on_message,
                                             on_error=self.on_error,
                                             on_close=self.on_close,
                                             on_open=self.on_open)
            self.setDaemon(True)
            self.start()

        def run(self):
            self.ws.run_forever()

        def on_message(self, ws, message):
            self.in_queue.put(message)
            logger.info("from %s:%s" % (self.name, message))

        def on_error(self, ws, error):
            logger.error(error)

        def on_close(self, ws):
            logger.info("closed %s" % self.name)

        def on_open(self, ws):
            logger.info("opened %s" % self.name)

        def stop(self):
            self.ws.close()

        def send_to_socket(self, data):
            self.ws.send(data)

        def receive_next_message(self):
            return self.in_queue.get(block=False)








