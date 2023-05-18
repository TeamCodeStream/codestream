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
