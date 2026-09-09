import os
from flask import Flask
from dotenv import load_dotenv
from database import init_db
from routes.views import views_bp
from routes.api import api_bp

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "bythebooks-dev-key-change-in-prod")

app.register_blueprint(views_bp)
app.register_blueprint(api_bp)

init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
