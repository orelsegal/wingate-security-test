import { useState } from "react";
import { useApp } from "../data/appContext";
import type { Role } from "../data/types";

export function LoginScreen() {
  const { theme, students, signIn, course } = useApp();
  const [role, setRole] = useState<Role>("student");

  return (
    <div className="container">
      <div className="login">
        <div className="login__brand">
          <span className="login__mark" aria-hidden="true">
            {theme.icon}
          </span>
          <h1 className="page-title">{theme.subjectName}</h1>
          <p className="page-sub">{course.intro}</p>
          {theme.percentBadge && <span className="badge-pct">{theme.percentBadge}</span>}
        </div>

        <div className="card card--pad-lg stack">
          <div className="role-tabs" role="tablist" aria-label="בחירת סוג משתמש">
            <button
              type="button"
              role="tab"
              aria-selected={role === "student"}
              className={`role-tab${role === "student" ? " role-tab--on" : ""}`}
              onClick={() => setRole("student")}
            >
              תלמידה
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === "teacher"}
              className={`role-tab${role === "teacher" ? " role-tab--on" : ""}`}
              onClick={() => setRole("teacher")}
            >
              מורה
            </button>
          </div>

          {role === "student" ? (
            <div className="stack stack--sm">
              <p className="card__text">בחרי את השם שלך כדי להיכנס:</p>
              <ul className="person-list">
                {students.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className="person-btn"
                      onClick={() =>
                        signIn({ role: "student", studentId: student.id, name: student.name })
                      }
                    >
                      <span className="avatar" aria-hidden="true">
                        {student.name.slice(0, 1)}
                      </span>
                      <span>
                        {student.name}
                        {student.group && (
                          <span className="header__sub" style={{ display: "block" }}>
                            {student.group}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="stack stack--sm">
              <p className="card__text">כניסה למסך המורה: מעקב אחרי התלמידות, בדיקה ואישור.</p>
              <button
                type="button"
                className="btn btn--block"
                onClick={() => signIn({ role: "teacher", name: "מורה" })}
              >
                כניסה כמורה
              </button>
            </div>
          )}
        </div>

        <p className="footnote">בחירת משתמש להדגמה בלבד — אין כאן התחברות אמיתית.</p>
      </div>
    </div>
  );
}
