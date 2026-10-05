import { Link } from 'react-router'
import { FaHeartbeat, FaShieldAlt } from 'react-icons/fa'
import './AuthShell.css'

function AuthShell({
  tone = 'blue',
  eyebrow,
  title,
  description,
  features = [],
  panelClassName = '',
  children
}) {
  return (
    <div className={`auth-page auth-page--${tone}`}>
      <aside className="auth-aside">
        <div className="auth-aside__glow auth-aside__glow--one" />
        <div className="auth-aside__glow auth-aside__glow--two" />
        <div className="auth-aside__grid" />

        <Link to="/login" className="auth-brand">
          <span className="auth-brand__mark">
            <FaHeartbeat />
          </span>
          <span>
            <strong>Clinical Med</strong>
            <small>Gestão clínica inteligente</small>
          </span>
        </Link>

        <div className="auth-aside__content">
          <span className="auth-aside__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>

          <div className="auth-feature-list">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div key={feature.title} className="auth-feature">
                  <span>
                    <Icon />
                  </span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="auth-aside__security">
          <FaShieldAlt />
          <span>
            <strong>Ambiente protegido</strong>
            <small>Seus dados são tratados com segurança.</small>
          </span>
        </div>
      </aside>

      <main className="auth-main">
        <div className={`auth-panel ${panelClassName}`}>
          <Link to="/login" className="auth-mobile-brand">
            <span>
              <FaHeartbeat />
            </span>
            Clinical Med
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthShell
