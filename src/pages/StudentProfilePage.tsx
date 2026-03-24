const StudentProfilePage = () => {
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

      <h1 className="text-2xl font-bold">{student.name}</h1>

      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold mb-2">ציונים</h2>

        {student.grades.map((g, i) => (
          <div key={i} className="flex justify-between">
            <span>{g.subject}</span>
            <span>{g.grade}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold mb-2">תמיכה והתאמות</h2>

        <p>אבחונים: {student.diagnostics ? "✔️ יש" : "❌ אין"}</p>
        <p>הקלות: {student.accommodations}</p>
        <p>מרכז למידה: {student.learningCenter ? "כן" : "לא"}</p>
        <p>מקצועות קשים: {student.weakSubjects.join(", ")}</p>
      </div>

    </div>
  );
};

export default StudentProfilePage;
