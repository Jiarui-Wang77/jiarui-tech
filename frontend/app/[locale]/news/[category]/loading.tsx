export default function NewsCategoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-[72px] bg-white border-b border-gray-100" />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Category menu */}
          <div className="flex gap-3 mb-8 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-20 bg-gray-200 rounded-full shrink-0" />
            ))}
          </div>

          {/* Featured card */}
          <div className="mb-6 bg-white rounded-2xl overflow-hidden border border-gray-100 md:flex h-52">
            <div className="md:w-2/5 bg-gray-200" />
            <div className="flex-1 p-6 space-y-3">
              <div className="h-4 w-24 bg-gray-200 rounded-full" />
              <div className="h-6 bg-gray-200 rounded-xl w-full" />
              <div className="h-6 bg-gray-200 rounded-xl w-3/4" />
              <div className="h-4 w-32 bg-gray-200 rounded-full mt-auto" />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-gray-200 rounded-full" />
                  <div className="h-5 bg-gray-200 rounded-lg w-full" />
                  <div className="h-5 bg-gray-200 rounded-lg w-4/5" />
                  <div className="h-3 w-24 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
