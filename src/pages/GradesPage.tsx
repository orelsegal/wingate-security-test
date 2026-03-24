const GradesPage = () => {
  const grades = [
    { subject: "היסטוריה", grade: 85, note: "עבודה מסכמת" },
    { subject: "אנגלית", grade: 78, note: "Module E" },
    { subject: "מתמטיקה", grade: 90, note: "מבדק" },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        ציונים
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        כל הציונים שלך במקום אחד
      </p>

      <div className="space-y-3">
        {grades.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center justify-between"
          >
            <div className="text-right">
              <h2 className="text-[15px] font-medium">{item.subject}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">{item.note}</p>
            </div>

            <div className="w-[52px] h-[52px] rounded-[16px] bg-[hsl(50,42%,90%)] flex items-center justify-center">
              <span className="text-[18px] font-medium">{item.grade}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradesPage;
