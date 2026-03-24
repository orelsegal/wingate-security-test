export const saveLastVisited = (key: string, value: string) => {
  try { localStorage.setItem(`wingate_last_${key}`, value); } catch {}
};

export const getLastVisited = (key: string): string | null => {
  try { return localStorage.getItem(`wingate_last_${key}`); } catch { return null; }
};

const RoadmapPage = () => {
  const steps = [
    { name: "יחידה 1", progress: 100, status: "הושלם" },
    { name: "יחידה 2", progress: 70, status: "בתהליך" },
    { name: "יחידה 3", progress: 30, status: "בתהליך" },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        מפת הדרכים שלי
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        התקדמות אישית, שלבים ואחוזי השלמה
      </p>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-right">
                <h2 className="text-[15px] font-medium">{step.name}</h2>
                <p className="text-[12px] text-muted-foreground mt-1">{step.status}</p>
              </div>

              <div className="w-[52px] h-[52px] rounded-[16px] bg-[hsl(145,18%,91%)] flex items-center justify-center">
                <span className="text-[15px] font-medium">{step.progress}%</span>
              </div>
            </div>

            <div className="w-full bg-[hsl(220,16%,92%)] rounded-full h-[5px] overflow-hidden">
              <div
                className="bg-[hsl(140,55%,47%)] h-[5px] rounded-full"
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
