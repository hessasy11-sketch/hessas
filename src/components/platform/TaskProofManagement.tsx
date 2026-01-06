import { useState } from 'react';
import { Upload, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useTaskProofs } from '../../hooks/useTaskProofs';
import ProofUploadModal from './ProofUploadModal';
import ProofReviewModal from './ProofReviewModal';

interface TaskProofManagementProps {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  requiresProof: boolean;
  onActionComplete?: () => void;
}

export default function TaskProofManagement({
  taskId,
  taskTitle,
  taskStatus,
  requiresProof,
  onActionComplete
}: TaskProofManagementProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const {
    task,
    proofs,
    loading,
    uploading,
    uploadProof,
    approveTask,
    rejectTask
  } = useTaskProofs(taskId);

  // Don't show anything if proof not required
  if (!requiresProof) return null;

  // Worker view - pending/in_progress tasks
  if (taskStatus === 'pending' || taskStatus === 'in_progress') {
    return (
      <>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          <Upload className="w-4 h-4" />
          رفع إثبات
        </button>

        {showUploadModal && task && (
          <ProofUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            taskTitle={taskTitle}
            onUpload={async (file, notes) => {
              const result = await uploadProof(file, notes);
              if (result?.success && onActionComplete) {
                onActionComplete();
              }
              return result || { success: false };
            }}
            uploading={uploading}
          />
        )}
      </>
    );
  }

  // Manager view - submitted tasks
  if (taskStatus === 'submitted') {
    return (
      <>
        <button
          onClick={() => setShowReviewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          <Eye className="w-4 h-4" />
          مراجعة الإثبات ({proofs.length})
        </button>

        {showReviewModal && task && (
          <ProofReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            task={task}
            proofs={proofs}
            onApprove={async (notes) => {
              const result = await approveTask('مدير المزرعة', notes);
              if (result?.success && onActionComplete) {
                onActionComplete();
              }
              return result || { success: false };
            }}
            onReject={async (reason) => {
              const result = await rejectTask('مدير المزرعة', reason);
              if (result?.success && onActionComplete) {
                onActionComplete();
              }
              return result || { success: false };
            }}
            loading={loading}
          />
        )}
      </>
    );
  }

  // Approved tasks - show success indicator
  if (taskStatus === 'approved') {
    return (
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">تم الاعتماد</span>
      </div>
    );
  }

  // Rejected tasks - show warning indicator
  if (taskStatus === 'rejected') {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm font-medium">مرفوض</span>
      </div>
    );
  }

  return null;
}
