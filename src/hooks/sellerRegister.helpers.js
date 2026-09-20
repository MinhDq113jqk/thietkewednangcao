export const sellerRegisterInitialForm = {
  description: '',
  location: '',
  name: '',
};

export const updateSellerRegisterForm = (form, fieldName, value) => ({
  ...form,
  [fieldName]: value,
});
