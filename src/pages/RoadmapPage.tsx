const RoadmapPage = () => {
  const steps = [
    { name: "יחידה 1", progress: 100, status: "הושלם" },
    { name: "יחידה 2", progress: 70, status: "בתהליך" },
    { name: "יחידה 3", progress: 30, status: "בתהליך" },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[22px] md:text-[28px] font-bold text-foreground text-right">
          מפת הדרכים שלי
        </h1>
        <p className="text-[14px] text-muted-foreground text-right mt-2">
          התקדמות אישית, שלבים ואחוזי השלמה
        </p>
      </div>

      <div className="space-y-5">
        {steps.map((step, index) => (
          <div
            key={index}
            className="w-full bg-white rounded-[28px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] px-6 py-6 text-right"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <h2 className="text-[18px] font-bold text-foreground">
                  {step.name}
                </h2>
                <p className="text-[14px] text-muted-foreground mt-1">
                  {step.status}
                </p>
              </div>

              <div className="min-w-[72px] h-[72px] rounded-[22px] bg-[hsl(145,45%,90%)] flex items-center justify-center">
                <span className="text-[20px] font-bold text-foreground">
                  {step.progress}%
                </span>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${step.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoadmapPage;
