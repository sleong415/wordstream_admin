import React, { useEffect, useState } from 'react';
import db from './firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import './App.css';

function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    direction: 'desc',
  });
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedData = data.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setReports(sortedData);
      setSortConfig({ key: 'timestamp', direction: 'desc' });
    } catch (err) {
      console.error('Error fetching Firebase reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const sortReports = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedReports = [...reports].sort((a, b) => {
      if (key === 'timestamp') {
        return direction === 'asc'
          ? new Date(a.timestamp) - new Date(b.timestamp)
          : new Date(b.timestamp) - new Date(a.timestamp);
      }
      if (key === 'title') {
        return direction === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return 0;
    });
    setReports(sortedReports);
  };

  const handleDeleteReport = async (id) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      setSelectedReport(null);
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleDeletePuzzle = async (title) => {
    if (!title) {
      alert('No title available for this report.');
      return;
    }
  
    const confirmDelete = window.confirm(
      `Are you sure you want to delete all puzzles and reports with title "${title}"?`
    );
    if (!confirmDelete) return;
  
    try {
      // Delete all matching puzzles
      const puzzlesRef = collection(db, 'wordstream');
      const puzzleQuery = query(puzzlesRef, where('title', '==', title));
      const puzzleSnapshot = await getDocs(puzzleQuery);
  
      if (!puzzleSnapshot.empty) {
        const puzzleDeletes = puzzleSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(puzzleDeletes);
        console.log(`Deleted ${puzzleSnapshot.docs.length} puzzle(s) with title "${title}"`);
      } else {
        console.log(`No puzzles found with title "${title}"`);
      }
  
      // Delete all matching reports
      const reportsRef = collection(db, 'reports');
      const reportQuery = query(reportsRef, where('title', '==', title));
      const reportSnapshot = await getDocs(reportQuery);
  
      if (!reportSnapshot.empty) {
        const reportDeletes = reportSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(reportDeletes);
        console.log(`Deleted ${reportSnapshot.docs.length} report(s) with title "${title}"`);
      } else {
        console.log(`No reports found with title "${title}"`);
      }
  
      // Update UI
      setReports((prev) => prev.filter((r) => r.title !== title));
      setSelectedReport(null);
      alert(`Deleted all puzzles and reports with title "${title}"`);
    } catch (error) {
      console.error('Error deleting puzzle and reports:', error);
      alert('An error occurred while deleting puzzle and reports.');
    }
  };
  

  return (
    <div className="app-container">
      <header className="header">
        <h1>Admin Dashboard</h1>
        <p>Reported Items</p>
      </header>

      <div className="content">
        {/* Left Side: List of Reports */}
        <div className="report-list">
          <div className="list-top-bar">
            <div className="sort-options">
              <button onClick={() => sortReports('title')}>
                Sort by Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
              </button>
              <button onClick={() => sortReports('timestamp')}>
                Sort by Date {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
              </button>
            </div>

            <div className="sort-options">
              <button onClick={fetchReports}>🔄 Refresh</button>
            </div>
          </div>

          {loading ? (
            <p className="loading">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="no-reports">No reports found.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Reported At</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} onClick={() => setSelectedReport(report)}>
                    <td>{report.title}</td>
                    <td>{new Date(report.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Side: Detailed View */}
        <div className="report-detail">
          {selectedReport ? (
            <>
              <div className="list-top-bar">
                <h2>{selectedReport.title}</h2>
                <div className="actions">
                  <button onClick={() => handleDeleteReport(selectedReport.id)}>🗑 Delete Report</button>
                  <button onClick={() => handleDeletePuzzle(selectedReport.title)}>🧩 Delete Puzzle</button>
                </div>
              </div>
              <p><strong>Reported At:</strong> {new Date(selectedReport.timestamp).toLocaleString()}</p>
              <h3>Comment:</h3>
              <p>{selectedReport.comment || 'No comment provided.'}</p>

              
            </>
          ) : (
            <p className="select-report">Select a report to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
