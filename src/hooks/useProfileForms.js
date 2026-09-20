import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import userApi from '../api/userApi';
import { toast } from '../components/ui/toastStore';
import useAuthStore from '../store/authStore';
import {
  createAddressPayload,
  createAddressForm,
  createProfileInitialForm,
  createPasswordPayload,
  initialAddressForm,
  initialPasswordForm,
  updateFormField,
  validatePasswordForm,
} from './profile.helpers';

export function useProfileInfoForm() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState(createProfileInitialForm(user));

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: userApi.getProfile,
  });

  useEffect(() => {
    if (!profileQuery.data) return;

    setUser(profileQuery.data);
  }, [profileQuery.data, setUser]);

  const updateProfile = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (data) => {
      const nextUser = data.user || data;
      setUser(nextUser);
      setForm(createProfileInitialForm(nextUser));
      toast.success(data.message || 'Cập nhật thông tin thành công');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại, thử lại sau'),
  });

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateFormField(currentForm, event.target.name, event.target.value)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    updateProfile.mutate(form);
  };

  return {
    form,
    handleChange,
    handleSubmit,
    loading: profileQuery.isLoading || updateProfile.isPending,
    user: profileQuery.data || user,
  };
}

export function useAddressBook() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(initialAddressForm);

  const addressesQuery = useQuery({
    queryKey: ['user-addresses'],
    queryFn: userApi.getAddresses,
  });

  const invalidateAddresses = () => {
    queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
  };

  const saveAddressMutation = useMutation({
    mutationFn: ({ editTarget: currentEditTarget, payload }) =>
      currentEditTarget
        ? userApi.updateAddress(currentEditTarget.id, payload)
        : userApi.createAddress(payload),
    onSuccess: () => {
      invalidateAddresses();
      setModalOpen(false);
      toast.success(editTarget ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể lưu địa chỉ'),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: userApi.deleteAddress,
    onSuccess: () => {
      invalidateAddresses();
      toast.success('Đã xóa địa chỉ');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể xóa địa chỉ'),
  });

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateFormField(currentForm, event.target.name, event.target.value)
    );
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(initialAddressForm);
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditTarget(address);
    setForm(createAddressForm(address));
    setModalOpen(true);
  };

  const handleDelete = (id) => deleteAddressMutation.mutate(id);

  const handleSave = () => {
    saveAddressMutation.mutate({
      editTarget,
      payload: createAddressPayload(form),
    });
  };

  return {
    addresses: addressesQuery.data || [],
    editTarget,
    form,
    handleChange,
    handleDelete,
    handleSave,
    isLoading: addressesQuery.isLoading,
    isSaving: saveAddressMutation.isPending,
    modalOpen,
    openAdd,
    openEdit,
    setModalOpen,
  };
}

export function usePasswordForm() {
  const [form, setForm] = useState(initialPasswordForm);
  const [errors, setErrors] = useState({});

  const changePassword = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => {
      setForm(initialPasswordForm);
      setErrors({});
      toast.success('Đổi mật khẩu thành công');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại'),
  });

  const handleChange = (event) => {
    setForm((currentForm) =>
      updateFormField(currentForm, event.target.name, event.target.value)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    changePassword.mutate(createPasswordPayload(form));
  };

  return {
    errors,
    form,
    handleChange,
    handleSubmit,
    loading: changePassword.isPending,
  };
}
