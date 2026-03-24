const ToolsPage = () => {
  const tools = [
    { title: "מחברת", description: "רישום אישי וסיכומים", emoji: "📓" },
    { title: "קישורים ללמידה", description: "אתרים ומשאבים שימושיים", emoji: "🔗" },
    { title: "מרכז למידה", description: "שיבוץ ותמיכה לימודית", emoji: "📍" },
    { title: "אתרים לתרגול", description: "תרגול נוסף לפי מקצוע", emoji: "🌐" },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        ארגז כלים
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        מחברת, קישורים, תרגול ומשאבים שימושיים
      </p>

      <div className="space-y-3">
        {tools.map((tool, index) => (
          <div
            key={index}
            className="bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center justify-between"
          >
            <div className="text-right">
              <h2 className="text-[15px] font-medium">{tool.title}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">{tool.description}</p>
            </div>

            <div className="w-[52px] h-[52px] rounded-[16px] bg-[hsl(210,18%,93%)] flex items-center justify-center text-[22px]">
              {tool.emoji}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
