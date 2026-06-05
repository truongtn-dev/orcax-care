import { useRef } from "react";

import { Link } from "react-router-dom";

import PageLayout from "../components/PageLayout.jsx";

import ScrollReveal from "../components/ScrollReveal.jsx";

import { useAuth } from "../context/AuthContext.jsx";

import { useHeroParallax } from "../hooks/useHeroParallax.js";



const BENEFITS = [

  {

    title: "Tìm bác sĩ phù hợp",

    description: "Xem danh sách chuyên khoa, so sánh hồ sơ và chọn bác sĩ bạn tin tưởng.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <circle cx="11" cy="11" r="8" />

        <path d="m21 21-4.3-4.3" />

      </svg>

    ),

  },

  {

    title: "Đặt lịch khám trực tuyến",

    description: "Chọn khung giờ, nhận xác nhận và dễ dàng đổi hoặc hủy khi cần.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <rect x="3" y="4" width="18" height="18" rx="2" />

        <path d="M16 2v4M8 2v4M3 10h18" />

      </svg>

    ),

  },

  {

    title: "Thanh toán thuận tiện",

    description: "Thanh toán qua ví hoặc cổng thanh toán phổ biến, theo dõi lịch sử rõ ràng.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <rect x="2" y="5" width="20" height="14" rx="2" />

        <path d="M2 10h20" />

      </svg>

    ),

  },

  {

    title: "Hồ sơ sức khỏe tập trung",

    description: "Ghi chú khám, kết quả xét nghiệm và đơn thuốc được lưu gọn gàng, dễ tra cứu.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

        <path d="M14 2v6h6M8 13h8M8 17h6" />

      </svg>

    ),

  },

  {

    title: "Giảm thời gian chờ",

    description: "Theo dõi trạng thái xếp hàng, nhận nhắc lịch hẹn và tìm chi nhánh gần bạn.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />

        <path d="M13.73 21a2 2 0 0 1-3.46 0" />

      </svg>

    ),

  },

  {

    title: "Bảo mật thông tin",

    description: "Đăng nhập an toàn, quản lý hồ sơ và bảo vệ dữ liệu sức khỏe cá nhân.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <rect x="3" y="11" width="18" height="11" rx="2" />

        <path d="M7 11V7a5 5 0 0 1 10 0v4" />

      </svg>

    ),

  },

];



const STEPS = [

  {

    title: "Tạo tài khoản",

    description: "Đăng ký trong vài phút và xác minh email để bắt đầu sử dụng.",

  },

  {

    title: "Đặt lịch với bác sĩ",

    description: "Tìm bác sĩ, chọn khung giờ phù hợp và xác nhận lịch hẹn.",

  },

  {

    title: "Khám bệnh và theo dõi",

    description: "Đến khám đúng giờ, theo dõi quá trình điều trị và xem kết quả, đơn thuốc sau khám.",

  },

];



export default function HomePage() {

  const heroRef = useRef(null);

  const { fullName, isAuthenticated, role } = useAuth();

  useHeroParallax(heroRef);



  const dashboardPath =

    role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : role === "patient" ? "/patient" : null;



  return (

    <PageLayout>

      <div className="landing">

        <section className="hero-section" ref={heroRef}>

          <div className="hero-shapes" aria-hidden="true">

            <div className="hero-shape hero-shape-1" />

            <div className="hero-shape hero-shape-2" />

          </div>



          <div className="hero-content">

            <div className="hero-badge hero-animate-in">

              <span className="hero-badge-dot" />

              Nền tảng y tế số tin cậy

            </div>



            <h1 className="hero-animate-in hero-animate-in-delay-1">

              {fullName ? (

                <>Chào mừng trở lại, {fullName.split(" ")[0]}</>

              ) : (

                <>Chăm sóc sức khỏe đơn giản và an toàn</>

              )}

            </h1>



            <p className="hero-sub hero-animate-in hero-animate-in-delay-2">

              {isAuthenticated

                ? "Đặt lịch khám, quản lý hồ sơ và theo dõi quá trình điều trị — tất cả trên một nền tảng."

                : "Tìm bác sĩ, đặt lịch khám, thanh toán trực tuyến và quản lý hồ sơ sức khỏe — nhanh gọn, không rắc rối."}

            </p>



            <div className="hero-actions hero-animate-in hero-animate-in-delay-3">

              <Link to="/search-doctors" className="btn btn-white btn-lg">

                Tìm bác sĩ

              </Link>

              {!isAuthenticated && (

                <Link to="/register" className="btn btn-outline btn-hero-outline btn-lg">

                  Đăng ký tài khoản

                </Link>

              )}

              {isAuthenticated && dashboardPath && (

                <Link to={dashboardPath} className="btn btn-outline btn-hero-outline btn-lg">

                  Trang cá nhân

                </Link>

              )}

            </div>



            <div className="hero-stats hero-animate-in hero-animate-in-delay-4">

              <div className="hero-stat">

                <span className="hero-stat-value">500+</span>

                <span className="hero-stat-label">Bác sĩ</span>

              </div>

              <div className="hero-stat">

                <span className="hero-stat-value">20+</span>

                <span className="hero-stat-label">Chuyên khoa</span>

              </div>

              <div className="hero-stat">

                <span className="hero-stat-value">24/7</span>

                <span className="hero-stat-label">Hỗ trợ trực tuyến</span>

              </div>

            </div>

          </div>

        </section>



        <section className="section">

          <ScrollReveal className="section-header" variant="up">

            <span className="section-label">Tại sao chọn OrcaXCare</span>

            <h2>Phù hợp với cuộc sống hàng ngày</h2>

            <p>

              Không dùng từ ngữ phức tạp — chỉ tập trung vào những gì bạn cần: tìm bác sĩ, đến hẹn khám và theo dõi

              sức khỏe sau mỗi lần khám.

            </p>

          </ScrollReveal>



          <div className="features-grid scroll-stagger-grid">

            {BENEFITS.map((item, i) => (

              <ScrollReveal key={item.title} as="article" className="feature-card" variant="float" delay={i * 100}>

                <div className="feature-icon-wrap">{item.icon}</div>

                <h3>{item.title}</h3>

                <p>{item.description}</p>

              </ScrollReveal>

            ))}

          </div>

        </section>



        <section className="section section-alt">

          <ScrollReveal className="section-header" variant="up">

            <span className="section-label">Cách sử dụng</span>

            <h2>Bắt đầu chỉ với 3 bước</h2>

            <p>Từ đăng ký đến tái khám — quy trình đơn giản, dễ theo dõi.</p>

          </ScrollReveal>



          <div className="steps-grid scroll-stagger-grid">

            {STEPS.map((step, i) => (

              <ScrollReveal key={step.title} className="step-card" variant="scale" delay={i * 140}>

                <div className="step-number">{i + 1}</div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>

              </ScrollReveal>

            ))}

          </div>

        </section>



        <ScrollReveal className="cta-section" variant="scale" delay={80}>

          <h2>Bạn đã sẵn sàng chăm sóc sức khỏe chủ động?</h2>

          <p>Đăng ký miễn phí hoặc xem danh sách bác sĩ — chỉ mất vài phút để bắt đầu.</p>

          <div className="cta-actions">

            <Link to="/register" className="btn btn-white btn-lg">

              Đăng ký ngay

            </Link>

            <Link to="/search-doctors" className="btn btn-outline btn-hero-outline btn-lg">

              Xem danh sách bác sĩ

            </Link>

          </div>

        </ScrollReveal>

      </div>

    </PageLayout>

  );

}

