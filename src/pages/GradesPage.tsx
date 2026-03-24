const GradesPage = () => {
  const grades = [
    { subject: "היסטוריה", grade: 85 },
    { subject: "אנגלית", grade: 78 },
    { subject: "מתמטיקה", grade: 90 },
  ];

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold text-right mb-6">
        הציונים שלי
      </h1>

      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        {grades.map((g, i) => (
          <div key={i} className="flex justify-between">
            <span>{g.subject}</span>
            <span className="font-bold">{g.grade}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default GradesPage;
