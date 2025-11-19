export default function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
          <span className="text-primary-foreground font-bold text-xl">RCS</span>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
