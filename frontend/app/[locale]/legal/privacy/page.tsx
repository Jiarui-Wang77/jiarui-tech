import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "隐私政策 — JIARUI TECH" : "Privacy Policy — JIARUI TECH",
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-[72px]">
        {/* Hero */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-3xl mx-auto px-6 py-14">
            <p className="text-xs font-bold tracking-[0.25em] text-neutral-400 uppercase mb-3">
              {isZh ? "法律文件" : "Legal"}
            </p>
            <h1 className="text-4xl font-black text-neutral-900 tracking-tight mb-3">
              {isZh ? "隐私政策" : "Privacy Policy"}
            </h1>
            <p className="text-neutral-500 text-sm">
              {isZh ? "最后更新：2026 年 4 月" : "Last updated: April 2026"}
            </p>
          </div>
        </div>

        {/* Content */}
        <article className="max-w-3xl mx-auto px-6 py-14 prose prose-neutral max-w-none">
          <div className="space-y-10 text-[15px] leading-[1.85] text-neutral-700">

            {isZh ? (
              <>
                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">概述</h2>
                  <p>JIARUI TECH（以下简称"我们"）非常重视您的隐私。本隐私政策说明我们如何收集、使用和保护您在使用本平台时提供的信息，涵盖新闻资讯、AI 助手 Juno、开发者社区、GitHub 追踪器、AI 模型雷达榜等所有服务。</p>
                  <p>使用本平台即表示您同意本政策的条款。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">我们收集的信息</h2>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">账户信息</h3>
                  <p>注册时，我们收集您的用户名、电子邮件地址及加密后的密码。您也可以选择添加头像、个人简介、年龄和地区等可选信息。</p>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">使用数据</h3>
                  <p>我们记录您与平台的交互行为，包括浏览的页面、发布的社区内容、点赞和关注关系，以及使用 Juno AI 的会话记录。AI 对话记录仅用于功能实现与服务优化，不会出售给第三方。</p>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">技术信息</h3>
                  <p>包括 IP 地址、浏览器类型、操作系统、访问时间等日志信息，用于维护平台安全与稳定运行。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">信息的使用方式</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>提供、维护和改进我们的服务</li>
                    <li>处理您的账户注册与身份验证</li>
                    <li>向您发送与账户相关的通知（如有需要）</li>
                    <li>分析平台使用模式以优化用户体验</li>
                    <li>防范欺诈和滥用行为</li>
                    <li>遵守适用的法律法规要求</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">第三方服务</h2>
                  <p>本平台使用以下第三方服务，可能涉及数据传输：</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Juno-Alpha：</strong>用于驱动 Juno AI 助手，您的对话内容会被发送至相应服务商处理。</li>
                    <li><strong>GitHub API：</strong>用于获取开源项目数据，不涉及个人信息传输。</li>
                    <li><strong>云存储服务：</strong>用于存储用户上传的图片和文件。</li>
                  </ul>
                  <p className="mt-3">我们不会出售、出租或以其他方式向无关第三方披露您的个人信息。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">数据安全</h2>
                  <p>我们采用行业标准的安全措施保护您的数据，包括传输加密（HTTPS/TLS）、密码哈希存储（bcrypt）以及访问控制机制。尽管如此，没有任何互联网传输方式或电子存储系统能做到 100% 安全。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">数据保留</h2>
                  <p>您的账户信息在账户存续期间保留。AI 对话记录默认保留 90 天，您可以在账户设置中手动删除。社区发布的内容在删除前持续保存。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">您的权利</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>访问权：</strong>您可以查看我们持有的关于您的个人数据。</li>
                    <li><strong>更正权：</strong>您可以更新或纠正您的个人信息。</li>
                    <li><strong>删除权：</strong>您可以请求删除您的账户及相关数据。</li>
                    <li><strong>可携带权：</strong>您可以请求导出您的数据。</li>
                  </ul>
                  <p className="mt-3">如需行使上述权利，请联系：<a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Cookie</h2>
                  <p>我们使用 Cookie 和类似技术来维持您的登录状态、记住您的偏好设置。您可以通过浏览器设置拒绝 Cookie，但这可能影响部分功能的正常使用。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">儿童隐私</h2>
                  <p>本平台不面向 13 岁以下儿童。我们不会故意收集儿童的个人信息。如发现存在相关情况，请立即联系我们。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">政策变更</h2>
                  <p>我们可能会不时更新本隐私政策。重大变更将在平台上公告通知。继续使用本平台即视为您接受修订后的政策。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">联系我们</h2>
                  <p>如有任何隐私相关问题，请通过以下方式联系：</p>
                  <p><strong>邮箱：</strong><a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Overview</h2>
                  <p>JIARUI TECH ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy describes how we collect, use, and safeguard information you provide when using our platform — including our news feed, Juno AI assistant, developer community, GitHub tracker, and AI model leaderboard.</p>
                  <p>By using the platform, you agree to the terms of this policy.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Information We Collect</h2>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">Account Information</h3>
                  <p>When you register, we collect your username, email address, and a securely hashed password. You may optionally provide an avatar, bio, age, and region.</p>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">Usage Data</h3>
                  <p>We log your interactions with the platform, including pages visited, community content you post, likes and follows, and Juno AI chat sessions. AI conversation history is used solely to deliver and improve the service and is never sold to third parties.</p>
                  <h3 className="font-semibold text-neutral-800 mt-4 mb-2">Technical Information</h3>
                  <p>We collect standard server log data such as IP address, browser type, operating system, and access timestamps for security and stability monitoring.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">How We Use Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To provide, maintain, and improve our services</li>
                    <li>To process account registration and authentication</li>
                    <li>To send account-related notifications when necessary</li>
                    <li>To analyze usage patterns and optimize the user experience</li>
                    <li>To detect and prevent fraud or abuse</li>
                    <li>To comply with applicable laws and regulations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Third-Party Services</h2>
                  <p>We use the following third-party services which may involve data transfer:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Juno-Alpha:</strong> Powers the Juno AI assistant. Your conversation content is sent to the respective AI provider for processing.</li>
                    <li><strong>GitHub API:</strong> Retrieves open-source repository data. No personal information is transmitted.</li>
                    <li><strong>Cloud Storage:</strong> Stores user-uploaded images and files.</li>
                  </ul>
                  <p className="mt-3">We do not sell, rent, or otherwise disclose your personal information to unrelated third parties.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Data Security</h2>
                  <p>We implement industry-standard security measures, including HTTPS/TLS encryption in transit, bcrypt password hashing, and access controls. However, no transmission method or storage system is 100% secure.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Data Retention</h2>
                  <p>Account information is retained for the duration of your account. AI conversation history is retained for 90 days by default and can be manually deleted from your account settings. Community content persists until you delete it.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Your Rights</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
                    <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
                    <li><strong>Portability:</strong> Request an export of your data.</li>
                  </ul>
                  <p className="mt-3">To exercise these rights, contact: <a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Cookies</h2>
                  <p>We use cookies and similar technologies to maintain your login session and remember preferences. You may disable cookies in your browser settings, though this may affect some functionality.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Children&apos;s Privacy</h2>
                  <p>This platform is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we have inadvertently done so, please contact us immediately.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Changes to This Policy</h2>
                  <p>We may update this Privacy Policy from time to time. Material changes will be announced on the platform. Continued use of the platform constitutes acceptance of the revised policy.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Contact Us</h2>
                  <p>For privacy-related inquiries, please reach out:</p>
                  <p><strong>Email:</strong> <a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
                </section>
              </>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
