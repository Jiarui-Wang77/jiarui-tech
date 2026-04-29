export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Navbar placeholder */}
      <div className="h-[72px] bg-white border-b border-gray-100" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button */}
        <div className="h-5 w-24 bg-gray-200 rounded-full mb-8" />

        {/* Category tag */}
        <div className="h-6 w-20 bg-gray-200 rounded-full mb-4" />

        {/* Title */}
        <div className="space-y-3 mb-6">
          <div className="h-9 bg-gray-200 rounded-xl w-full" />
          <div className="h-9 bg-gray-200 rounded-xl w-4/5" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-4 w-24 bg-gray-200 rounded-full" />
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
        </div>

        {/* Cover image */}
        <div className="h-72 sm:h-96 bg-gray-200 rounded-2xl mb-10" />

        {/* Body paragraphs */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-full w-full" />
              <div className="h-4 bg-gray-200 rounded-full w-full" />
              <div className="h-4 bg-gray-200 rounded-full w-3/4" />
            </div>
          ))}
        </div>

        {/* Deep analysis block */}
        <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-100">
          <div className="h-6 w-32 bg-gray-200 rounded-full mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded-full w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
