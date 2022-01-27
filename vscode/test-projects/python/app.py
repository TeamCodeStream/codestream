import requests
from flask import Flask
from newrelic.agent import FunctionTraceWrapper, function_trace

from . import db

app = Flask(__name__)
con = None


class MyClass(object):
    @function_trace()
    def my_method(self):
        return 1


@app.route("/")
def hello_world():
    call_me()  # Maybe
    MyClass().my_method()
    my_lambda = FunctionTraceWrapper(lambda: 1)
    my_lambda()

    return "Hello World!"


@app.route("/error")
def error():
    raise ValueError("1 != 0")


@app.route("/external")
def external_call():
    req = requests.get("http://localhost:8000/external/source")
    req.raise_for_status()

    return " ".join(("External:", req.text))


@app.route("/external/source")
def external_source():
    return "Hello, fellow humans!\n"


@app.route("/external/error")
def external_error():
    req = requests.get("http://localhost:8000/error")
    req.raise_for_status()

    return req.text


@app.route("/letters/<id_>")
def db_call(id_):
    con = db.connect()
    cursor = con.execute("SELECT letter FROM letters WHERE id=%d" % int(id_))
    return str(cursor.fetchone()[0])  # Intentional indexing issues here


def call_me(i=3):
    if i <= 0:
        return other_function()
    return call_me(i - 1)


def other_function():
    print("Hello")
    return 3
