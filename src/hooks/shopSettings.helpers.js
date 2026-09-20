export const createShopSettingsPayload = (formData) => ({
  banner: String(formData.get('banner') || ''),
  description: String(formData.get('description') || ''),
  location: String(formData.get('location') || ''),
  logo: String(formData.get('logo') || ''),
  name: String(formData.get('name') || ''),
});

export const setUploadedShopImageUrl = ({ form, fieldName, url }) => {
  if (form?.elements?.[fieldName]) {
    form.elements[fieldName].value = url;
  }
};
