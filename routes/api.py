from flask import Blueprint, request, jsonify
from services.standards import search_standards, get_standard, get_all_frameworks, get_all_topics
from services.chatbot import get_chat_response, get_compare_response, resolve_key

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/standards")
def standards_list():
    q = request.args.get("q", "").strip()
    framework = request.args.getlist("framework") or request.args.get("framework")
    topic = request.args.getlist("topic") or request.args.get("topic")
    status = request.args.get("status", "").strip() or None
    results = search_standards(q=q or None, framework=framework or None, topic=topic or None, status=status)
    return jsonify(results)


@api_bp.route("/standards/<int:standard_id>")
def standard_detail(standard_id):
    std = get_standard(standard_id)
    if not std:
        return jsonify({"error": "Not found"}), 404
    return jsonify(std)


@api_bp.route("/frameworks")
def frameworks_list():
    return jsonify(get_all_frameworks())


@api_bp.route("/topics")
def topics_list():
    return jsonify(get_all_topics())


@api_bp.route("/compare", methods=["POST"])
def compare():
    data = request.get_json(silent=True) or {}
    id_a = data.get("standard_id_1")
    id_b = data.get("standard_id_2")
    api_key = data.get("api_key")

    if not id_a or not id_b:
        return jsonify({"error": "Provide standard_id_1 and standard_id_2"}), 400

    std_a = get_standard(id_a)
    std_b = get_standard(id_b)

    if not std_a or not std_b:
        return jsonify({"error": "One or both standards not found"}), 404

    if std_a["id"] == std_b["id"]:
        return jsonify({"error": "Select two different standards"}), 400

    ai_comparison = None
    try:
        ai_comparison = get_compare_response(std_a, std_b, api_key)
    except Exception:
        ai_comparison = None

    return jsonify({
        "standard_a": std_a,
        "standard_b": std_b,
        "ai_comparison": ai_comparison,
        "ai_powered": ai_comparison is not None,
    })


@api_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history", [])
    api_key = data.get("api_key")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    if not resolve_key(api_key):
        return jsonify({"error": "api_key_required"}), 400

    try:
        result = get_chat_response(message, history, api_key)
    except Exception as e:
        return jsonify({"error": f"AI response failed: {str(e)}"}), 500

    return jsonify(result)
