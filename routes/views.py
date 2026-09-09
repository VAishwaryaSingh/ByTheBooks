from flask import Blueprint, render_template, abort
from services.standards import search_standards, get_standard, get_all_frameworks, get_all_topics

views_bp = Blueprint("views", __name__)


@views_bp.route("/")
def index():
    frameworks = get_all_frameworks()
    featured = search_standards(limit=6)
    return render_template("index.html", frameworks=frameworks, featured=featured)


@views_bp.route("/browse")
def browse():
    frameworks = get_all_frameworks()
    topics = get_all_topics()
    return render_template("browse.html", frameworks=frameworks, topics=topics)


@views_bp.route("/standards/<int:standard_id>")
def standard_detail(standard_id):
    std = get_standard(standard_id)
    if not std:
        abort(404)
    return render_template("standard.html", standard=std)


@views_bp.route("/compare")
def compare():
    frameworks = get_all_frameworks()
    return render_template("compare.html", frameworks=frameworks)


@views_bp.route("/chat")
def chat():
    return render_template("chat.html")
