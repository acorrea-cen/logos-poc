import sqlite3

db = sqlite3.connect("prisma/prisma/dev.db")

c1 = db.execute("UPDATE \"Job\" SET status='FAILED', completedAt=datetime('now') WHERE status='RUNNING'")
c2 = db.execute("UPDATE \"Video\" SET status='ERROR' WHERE status IN ('TRANSCRIBING','EXTRACTING_AUDIO','GENERATING_EMBEDDINGS')")
db.commit()
print(f"Jobs reseteados: {c1.rowcount}, Videos reseteados: {c2.rowcount}")
db.close()
