import { useParams } from "react-router-dom";

const StudentProfilePage = () => {
  const { id } = useParams();

  // דוגמה לנתונים (בהמשך נחבר לגוגל שיט)
  const student = {
    name: "אביתר גץ",
    status: "🔴 אדום",

    diagnostics: true,
    accommodations: "זמן נוסף, הקראה",
    learningCenter: true,
    weakSubjects: ["אנגלית", "מתמטיקה"],

    grades: [
      { subject: "היסטוריה", grade: 85 },
      { subject: "אנגלית", grade: 60 },
      { subject: "מתמטיקה", grade: 55 },
    ],
  };

  return (
    <div className="p-4 space-y-6">

      {/* 🧑‍🎓 שם תלמיד */}
      <div>
        <h1 className="text-2xl font-bold">{student.name}</h1>
        <p className="text-lg mt-1">{student.status}</p>
      </div>

      {/* 📊 ציונים */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-bold mb-3">ציונים</h2>

        <div className="space-y-2">
          {student.grades.map((g, index) => (
            <div key={index} className="flex justify-between">
              <span>{g.subject}</span>
              <span>{g.grade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🧠 תמיכה והתאמות */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-bold mb-3">תמיכה והתאמות</h2>

        <div className="space-y-2 text-sm">
          <p>
            אבחונים: {student.diagnostics ? "✔️ יש" : "❌ אין"}
          </p>

          <p>
            הקלות: {student.accommodations || "אין"}
          </p>

          <p>
            מרכז למידה: {student.learningCenter ? "משתתף" : "לא משתתף"}
          </p>

          <p>
            מקצועות עם קושי:{" "}
            {student.weakSubjects.length > 0
              ? student.weakSubjects.join(", ")
              : "אין"}
          </p>
        </div>
      </div>

    </div>
  );
};

export default StudentProfilePage;
