import { useState, useEffect } from 'react';
import { X, Users, Trash2, Loader2, Shield } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TeamDetailsModalProps {
  teamId: string;
  onClose: () => void;
  onRefresh: () => void;
}

interface TeamMember {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_code: string;
  role_in_team: string;
  joined_at: string;
}

interface TeamDetails {
  team: {
    id: string;
    team_name: string;
    team_type: string;
    is_active: boolean;
    leader_name: string | null;
  };
  members: TeamMember[];
}

export default function TeamDetailsModal({ teamId, onClose, onRefresh }: TeamDetailsModalProps) {
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
  }, [teamId]);

  const loadDetails = async () => {
    try {
      const { data, error } = await supabase.rpc('get_team_details', {
        p_team_id: teamId
      });

      if (error) throw error;
      setDetails(data);
    } catch (error) {
      console.error('Error loading team details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('هل تريد إزالة هذا العضو من الفريق؟')) return;

    try {
      setRemovingId(memberId);

      const { data, error } = await supabase.rpc('remove_team_member', {
        p_member_id: memberId
      });

      if (error) throw error;

      if (data?.success) {
        loadDetails();
        onRefresh();
      } else {
        alert(data?.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('حدث خطأ أثناء إزالة العضو');
    } finally {
      setRemovingId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      leader: 'قائد',
      assistant: 'مساعد',
      member: 'عضو',
      technician: 'فني'
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      leader: 'bg-purple-100 text-purple-700',
      assistant: 'bg-blue-100 text-blue-700',
      member: 'bg-gray-100 text-gray-700',
      technician: 'bg-green-100 text-green-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {details?.team.team_name || 'تفاصيل الفريق'}
              </h2>
              {details?.team.leader_name && (
                <p className="text-sm text-gray-500">
                  القائد: {details.team.leader_name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !details || details.members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا يوجد أعضاء في هذا الفريق</p>
            </div>
          ) : (
            <div className="space-y-3">
              {details.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.staff_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {member.staff_code}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                            member.role_in_team
                          )}`}
                        >
                          {getRoleLabel(member.role_in_team)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingId === member.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="إزالة من الفريق"
                  >
                    {removingId === member.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
