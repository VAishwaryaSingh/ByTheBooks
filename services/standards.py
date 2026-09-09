from database import get_db


def search_standards(q=None, framework=None, topic=None, status=None, limit=100):
    conn = get_db()
    conditions = []
    params = []

    if q:
        conditions.append("(s.code LIKE ? OR s.title LIKE ? OR s.summary LIKE ?)")
        like = f"%{q}%"
        params += [like, like, like]
    if framework:
        frameworks = framework if isinstance(framework, list) else [framework]
        placeholders = ",".join("?" * len(frameworks))
        conditions.append(f"f.code IN ({placeholders})")
        params += frameworks
    if topic:
        topics = topic if isinstance(topic, list) else [topic]
        placeholders = ",".join("?" * len(topics))
        conditions.append(f"""s.id IN (
            SELECT st.standard_id FROM standard_topics st
            JOIN topics t ON t.id = st.topic_id
            WHERE t.name IN ({placeholders})
        )""")
        params += topics
    if status:
        conditions.append("s.status = ?")
        params.append(status)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = conn.execute(
        f"""SELECT s.id, s.code, s.title, s.status, s.effective_date,
                   s.summary, s.official_url,
                   f.name AS framework_name, f.code AS framework_code,
                   f.region
            FROM standards s
            JOIN frameworks f ON f.id = s.framework_id
            {where}
            ORDER BY f.code, s.code
            LIMIT ?""",
        params + [limit],
    ).fetchall()

    result = []
    for r in rows:
        row = dict(r)
        row["topics"] = _get_standard_topics(conn, r["id"])
        result.append(row)

    conn.close()
    return result


def get_standard(standard_id):
    conn = get_db()
    row = conn.execute(
        """SELECT s.*, f.name AS framework_name, f.code AS framework_code,
                  f.official_url AS framework_url, f.region, f.governing_body
           FROM standards s
           JOIN frameworks f ON f.id = s.framework_id
           WHERE s.id = ?""",
        (standard_id,),
    ).fetchone()

    if not row:
        conn.close()
        return None

    result = dict(row)
    result["topics"] = _get_standard_topics(conn, standard_id)
    result["key_points"] = [p.strip() for p in (result.get("key_points") or "").split("|") if p.strip()]
    result["related"] = _get_related_standards(conn, standard_id, result["topics"], result["framework_id"])
    conn.close()
    return result


def get_standard_by_code(code):
    conn = get_db()
    row = conn.execute(
        """SELECT s.id FROM standards s WHERE LOWER(s.code) = LOWER(?)""",
        (code,),
    ).fetchone()
    conn.close()
    if row:
        return get_standard(row["id"])
    return None


def get_all_frameworks():
    conn = get_db()
    rows = conn.execute(
        "SELECT *, (SELECT COUNT(*) FROM standards s WHERE s.framework_id = frameworks.id) AS standard_count FROM frameworks ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_topics():
    conn = get_db()
    rows = conn.execute(
        "SELECT *, (SELECT COUNT(*) FROM standard_topics st WHERE st.topic_id = topics.id) AS standard_count FROM topics ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _get_standard_topics(conn, standard_id):
    rows = conn.execute(
        """SELECT t.name FROM topics t
           JOIN standard_topics st ON st.topic_id = t.id
           WHERE st.standard_id = ?
           ORDER BY t.name""",
        (standard_id,),
    ).fetchall()
    return [r["name"] for r in rows]


def _get_related_standards(conn, standard_id, topic_names, framework_id):
    if not topic_names:
        return []
    placeholders = ",".join("?" * len(topic_names))
    rows = conn.execute(
        f"""SELECT DISTINCT s.id, s.code, s.title, f.code AS framework_code
            FROM standards s
            JOIN frameworks f ON f.id = s.framework_id
            JOIN standard_topics st ON st.standard_id = s.id
            JOIN topics t ON t.id = st.topic_id
            WHERE t.name IN ({placeholders})
              AND s.id != ?
              AND s.framework_id != ?
            ORDER BY f.code, s.code
            LIMIT 6""",
        topic_names + [standard_id, framework_id],
    ).fetchall()
    return [dict(r) for r in rows]
