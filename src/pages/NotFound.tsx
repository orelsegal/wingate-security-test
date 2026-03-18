import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">אופס! העמוד לא נמצא</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          חזרה לדף הראשי
        </a>
      </div>
    </div>
  );
};

export default NotFound;
