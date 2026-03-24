const ToolsPage = () => {
  const tools = [
    { title: "מחברת", description: "רישום אישי וסיכומים", emoji: "📓" },
    { title: "קישורים ללמידה", description: "אתרים ומשאבים שימושיים", emoji: "🔗" },
    { title: "מרכז למידה", description: "שיבוץ ותמיכה לימודית", emoji: "📍" },
    { title: "אתרים לתרגול", description: "תרגול נוסף לפי מקצוע", emoji: "🌐" },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[22px] md:text-[28px] font-bold text-foreground text-right">
          ארגז כלים
        </h1>
        <p className="text-[14px] text-muted-foreground text-right mt-2">
          מחברת, קישורים, תרגול ומשאבים שימושיים
        </p>
      </div>

      <div className="space-y-4">
        {tools.map((tool, index) => (
          <div
            key={index}
            className="w-full bg-white rounded-[28px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] px-6 py-6 flex items-center justify-between text-right"
          >
            <div className="text-right">
              <h2 className="text-[18px] font-bold text-foreground leading-tight">
                {tool.title}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                {tool.description}
              </p>
            </div>

            <div className="min-w-[72px] h-[72px] rounded-[22px] bg-[hsl(210,35%,92%)] flex items-center justify-center text-[28px]">
              {tool.emoji}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
