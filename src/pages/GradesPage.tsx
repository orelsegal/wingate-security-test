const GradesPage = () => {
  const grades = [
    { subject: "היסטוריה", grade: 85, note: "עבודה מסכמת" },
    { subject: "אנגלית", grade: 78, note: "Module E" },
    { subject: "מתמטיקה", grade: 90, note: "מבדק" },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[22px] md:text-[28px] font-bold text-foreground text-right">
          הציונים שלי
        </h1>
        <p className="text-[14px] text-muted-foreground text-right mt-2">
          כל הציונים שלך במקום אחד
        </p>
      </div>

      <div className="space-y-4">
        {grades.map((item, index) => (
          <div
            key={index}
            className="w-full bg-white rounded-[28px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] px-6 py-6 flex items-center justify-between text-right"
          >
            <div className="text-right">
              <h2 className="text-[18px] font-bold text-foreground leading-tight">
                {item.subject}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                {item.note}
              </p>
            </div>

            <div className="min-w-[72px] h-[72px] rounded-[22px] bg-[hsl(50,85%,90%)] flex items-center justify-center">
              <span className="text-[24px] font-bold text-foreground">
                {item.grade}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradesPage;
