import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class CallErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Call Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Call Error
              </h2>
              <p className="text-gray-600">
                Something went wrong with the call. This might be due to network issues or browser compatibility.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p className="mb-2">Troubleshooting tips:</p>
              <ul className="text-left space-y-1">
                <li>• Check your internet connection</li>
                <li>• Allow camera and microphone permissions</li>
                <li>• Try using a different browser</li>
                <li>• Refresh the page and try again</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CallErrorBoundary;
