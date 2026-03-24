const RoadmapPage = () => {
  const steps = [
    { name: "יחידה 1", progress: 100 },
    { name: "יחידה 2", progress: 70 },
    { name: "יחידה 3", progress: 30 },
  ];

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold text-right mb-6">
        מפת הדרכים שלי
      </h1>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow">

            <div className="flex justify-between mb-2">
              <span>{step.name}</span>
              <span>{step.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div
                className="bg-green-500 h-2 rounded-full"
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
