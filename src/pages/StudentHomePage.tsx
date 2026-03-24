const StudentHomePage = () => {
  const items = [
    {
      title: "התחל למידה",
      subtitle: "גישה לקורסים וחומרי לימוד",
      icon: "📘",
      path: "/courses",
    },
    {
      title: "מפת הדרכים שלי",
      subtitle: "התקדמות אישית וציונים",
      icon: "📈",
      path: "/roadmap",
    },
    {
      title: "ציונים",
      subtitle: "כל הציונים במקום אחד",
      icon: "🎓",
      path: "/grades",
    },
    {
      title: "לוח שנה",
      subtitle: "משימות, מבחנים ואירועים",
      icon: "📅",
      path: "/calendar",
    },
    {
      title: "ארגז כלים",
      subtitle: "מחברת, קישורים ומשאבים",
      icon: "🛠️",
      path: "/tools",
    },
  ];

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* כותרת */}
      <h1 className="text-xl font-medium text-center mb-6">
        המרחב שלי
      </h1>

      {/* רשימה */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.path}
            className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            {/* אייקון קטן */}
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-lg">
              {item.icon}
            </div>

            {/* טקסט */}
            <div className="flex-1 text-right">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-gray-500">{item.subtitle}</div>
            </div>

            {/* חץ */}
            <div className="text-gray-400 text-sm">›</div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default StudentHomePage;
