import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar title="Documents" />
      <main className="ml-64 mt-20 px-6 pb-6 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-2 text-gray-600">Manage documents and uploads for applications.</p>
        </div>
      </main>
    </div>
  );
}
