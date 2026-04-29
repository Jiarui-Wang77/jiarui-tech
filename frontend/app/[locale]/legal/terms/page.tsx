import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "使用条款 — JIARUI TECH" : "Terms of Service — JIARUI TECH",
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-[72px]">
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-3xl mx-auto px-6 py-14">
            <p className="text-xs font-bold tracking-[0.25em] text-neutral-400 uppercase mb-3">
              {isZh ? "法律文件" : "Legal"}
            </p>
            <h1 className="text-4xl font-black text-neutral-900 tracking-tight mb-3">
              {isZh ? "使用条款" : "Terms of Service"}
            </h1>
            <p className="text-neutral-500 text-sm">
              {isZh ? "最后更新：2025 年 4 月" : "Last updated: April 2025"}
            </p>
          </div>
        </div>

        <article className="max-w-3xl mx-auto px-6 py-14">
          <div className="space-y-10 text-[15px] leading-[1.85] text-neutral-700">
            {isZh ? (
              <>
                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">接受条款</h2>
                  <p>欢迎使用 JIARUI TECH 平台。访问或使用本平台，即表示您已阅读、理解并同意受本使用条款的约束。若您不同意任何条款，请停止使用本平台。</p>
                  <p className="mt-2">我们保留随时修改这些条款的权利，修改后的条款一经发布即生效。继续使用本平台视为接受修改后的条款。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">平台服务</h2>
                  <p>JIARUI TECH 提供以下服务：</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>AI 资讯：</strong>精选 AI 与科技前沿新闻</li>
                    <li><strong>Juno AI 助手：</strong>基于大语言模型的智能对话助手</li>
                    <li><strong>开发者社区：</strong>发布、讨论、互动的内容平台</li>
                    <li><strong>GitHub 追踪器：</strong>追踪开源项目动态</li>
                    <li><strong>AI 模型雷达榜：</strong>AI 模型评分与社区评价</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">账户注册</h2>
                  <p>注册账户时，您须提供真实、准确、完整的信息。您有责任妥善保管账户凭证，并对账户下的所有活动负责。如发现账户被未经授权使用，请立即通知我们。</p>
                  <p className="mt-2">您必须年满 13 岁方可注册使用本平台。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">用户内容</h2>
                  <p>您在社区发布的内容（文章、评论、图片等）归您所有。发布内容时，您授予 JIARUI TECH 非独占性、全球性、免版税的许可，以展示、分发和推广该内容用于平台运营目的。</p>
                  <p className="mt-2">您保证所发布内容不侵犯任何第三方的知识产权，且您有权授予上述许可。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">禁止行为</h2>
                  <p>使用本平台时，您不得：</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>发布违法、虚假、误导性、仇恨或骚扰性内容</li>
                    <li>侵犯他人知识产权、隐私权或其他合法权利</li>
                    <li>发送垃圾信息或进行任何形式的滥用行为</li>
                    <li>尝试未经授权访问系统或其他用户的账户</li>
                    <li>使用自动化工具抓取或滥用平台数据</li>
                    <li>传播病毒、恶意软件或其他有害代码</li>
                    <li>将 Juno AI 的输出用于非法目的</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Juno AI 免责声明</h2>
                  <p>Juno AI 是一款基于大语言模型的对话助手。其生成的内容可能不准确，<strong>不构成专业法律、医疗、财务或投资建议</strong>。请自行核实重要信息。</p>
                  <p className="mt-2">我们不对因依赖 Juno AI 输出而产生的任何损失或损害承担责任。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">知识产权</h2>
                  <p>平台的设计、代码、商标、品牌标识及我们创作的内容归 JIARUI TECH 所有，受著作权及相关法律保护。未经书面授权，不得复制、修改或商业使用。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">免责声明</h2>
                  <p>本平台按"现状"提供，不作任何明示或暗示的保证。我们不保证服务不中断、无错误或满足您的特定需求。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">责任限制</h2>
                  <p>在法律允许的最大范围内，JIARUI TECH 及其创始人、团队对任何间接、偶然、特殊或后果性损害不承担责任，包括数据丢失、利润损失或业务中断。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">账户终止</h2>
                  <p>我们保留因违反本条款而暂停或终止您账户的权利，恕不另行通知。您也可以随时联系我们注销您的账户。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">适用法律</h2>
                  <p>本条款受相关适用法律管辖。因本条款引发的任何争议，双方应首先尝试友好协商解决。</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">联系我们</h2>
                  <p>如有任何问题，请联系：<a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Acceptance of Terms</h2>
                  <p>Welcome to JIARUI TECH. By accessing or using this platform, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
                  <p className="mt-2">We reserve the right to modify these terms at any time. Changes take effect upon publication. Continued use of the platform constitutes acceptance.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Our Services</h2>
                  <p>JIARUI TECH provides the following services:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>AI News:</strong> Curated AI and technology news</li>
                    <li><strong>Juno AI Assistant:</strong> LLM-powered intelligent chat assistant</li>
                    <li><strong>Developer Community:</strong> A platform for publishing, discussing, and engaging</li>
                    <li><strong>GitHub Tracker:</strong> Track open-source repository momentum</li>
                    <li><strong>AI Radar:</strong> AI model ratings and community reviews</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Account Registration</h2>
                  <p>You must provide accurate, complete, and current information when registering. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account. Notify us immediately of any unauthorized use.</p>
                  <p className="mt-2">You must be at least 13 years of age to create an account.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">User Content</h2>
                  <p>Content you post (articles, comments, images, etc.) remains yours. By posting, you grant JIARUI TECH a non-exclusive, worldwide, royalty-free license to display, distribute, and promote that content for platform operation purposes.</p>
                  <p className="mt-2">You warrant that your content does not infringe third-party intellectual property rights and that you have the right to grant this license.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Prohibited Conduct</h2>
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Post illegal, false, misleading, hateful, or harassing content</li>
                    <li>Infringe intellectual property, privacy, or other rights of third parties</li>
                    <li>Send spam or engage in any form of platform abuse</li>
                    <li>Attempt unauthorized access to systems or other user accounts</li>
                    <li>Use automated tools to scrape or abuse platform data</li>
                    <li>Distribute viruses, malware, or other harmful code</li>
                    <li>Use Juno AI output for unlawful purposes</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Juno AI Disclaimer</h2>
                  <p>Juno AI is a conversational assistant powered by large language models. Its outputs may be inaccurate and <strong>do not constitute professional legal, medical, financial, or investment advice</strong>. Always verify important information independently.</p>
                  <p className="mt-2">We are not liable for any loss or damage arising from reliance on Juno AI outputs.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Intellectual Property</h2>
                  <p>The platform&apos;s design, code, trademarks, branding, and original content are owned by JIARUI TECH and protected by copyright and applicable laws. Reproduction, modification, or commercial use without written authorization is prohibited.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Disclaimer of Warranties</h2>
                  <p>The platform is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not guarantee uninterrupted, error-free service or that it will meet your specific requirements.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Limitation of Liability</h2>
                  <p>To the fullest extent permitted by law, JIARUI TECH and its founder and team shall not be liable for any indirect, incidental, special, or consequential damages including data loss, lost profits, or business interruption.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Account Termination</h2>
                  <p>We reserve the right to suspend or terminate your account for violations of these terms without prior notice. You may also request account deletion at any time by contacting us.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Governing Law</h2>
                  <p>These terms are governed by applicable law. Any disputes arising from these terms shall first be resolved through good-faith negotiation between the parties.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Contact</h2>
                  <p>For any questions: <a href="mailto:jiaruiwang456@gmail.com" className="text-blue-600 underline">jiaruiwang456@gmail.com</a></p>
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
