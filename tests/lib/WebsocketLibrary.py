#!/usr/bin/python
import subprocess
import sys
import thread
import time
from Queue import Queue
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
        self.socketList = []

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
            for s in self.socketList:
                if s.name == name:
                    return s
        except Exception as e:
            logger.error(e.message)

        raise Exception("%s socket not found in list" % name)

    def create_socket(self, name, uri):
        self.socketList.append(self.WebSocketConnection(uri, name=name))
        logger.info("created %s" % name)

    def do_exist_socket(self, name):
        for s in self.socketList:
            if name == s.name:
                logger.info("'%s' exists" % name)
                return
        raise AssertionError("'%s' does not exist" % name)


    def send_to_socket(self, socket, message):
        s = self._get_socket(socket)
        s.send_to_socket(message)
        logger.info("%s is sending '%s' message" % (s.name, message) )

    def stop_all_sockets(self):
        for s in self.socketList:
            s.stop()
            logger.info("%s stopped" % s.name)
            self.socketList.remove(s)

    def receive_message(self, name, message):
        def callback(received):
            logger.info("received message:%s" % received)
            if received != message:
                raise AssertionError("Expected message to be '%s' but was '%s'."
                                     % (message, received))

        self._get_socket(name).set_callback(callback)

    def receive_next_message(self, name):
        return self._get_socket(name).receive_next_message()

    def status_should_be(self, expected_status):
        if expected_status != self._status:
            raise AssertionError("Expected status to be '%s' but was '%s'."
                                 % (expected_status, self._status))

    def _run_command(self, command, *args):
        command = [sys.executable, self._sut_path, command] + list(args)
        process = subprocess.Popen(command, universal_newlines=True, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT)
        self._status = process.communicate()[0].strip()

    class WebSocketConnection(Thread):
        def __init__(self, url, name):
            Thread.__init__(self, name=name)
            # websocket.enableTrace(True)
            self.url = url
            self.name = name
            self.open_connection = True
            self.out_queue = Queue(10)
            self.in_queue = Queue(10)
            self.ws = websocket.WebSocketApp(self.url,
                                             on_message=self.on_message,
                                             on_error=self.on_error,
                                             on_close=self.on_close,
                                             on_open=self.on_open)
            self.setDaemon(True)
            self.start()

        def run(self):
            while self.open_connection:
                self.ws.run_forever()
                logger.warn("try to reconnect in 5 secs")
                time.sleep(5)

        def on_message(self, ws, message):
            self.in_queue.put(message)
            self.callback(message)
            logger.info("from %s:%s" % (self.name, message))

        def on_error(self, ws, error):
            logger.error(error)

        def on_close(self, ws):
            logger.info("### closed ###")

        def on_open(self, ws):
            logger.info("opened new socket")

            def run(*args):
                while self.open_connection:
                    # ws.send(self.queue.get(), opcode=websocket.ABNF.OPCODE_BINARY)
                    ws.send(self.out_queue.get())

            thread.start_new_thread(run, ())

        def stop(self):
            self.open_connection = False
            self.ws.close()

        def set_callback(self, callback):
            self.callback = callback

        def send_to_socket(self, data):
            if len(data) != 0:
                self.out_queue.put(data)

        def receive_next_message(self, timeout=2):
            return self.in_queue.get(timeout=timeout)








