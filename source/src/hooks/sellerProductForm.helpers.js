export const sellerProductCategories = ['Móc khóa', 'Nón', 'Tranh', 'Gốm', 'Vòng tay', 'Mây tre'];

export const findSellerProductById = (products, id) =>
  products.find((item) => item.id === id);

export const createSellerProductPayload = (formData) => {
  const image = String(formData.get('image') || '');
  const salePrice = formData.get('salePrice');

  return {
    category: String(formData.get('category') || ''),
    description: String(formData.get('description') || ''),
    images: image ? [image] : [],
    name: String(formData.get('name') || ''),
    price: Number(formData.get('price')),
    salePrice: salePrice ? Number(salePrice) : null,
    stock: Number(formData.get('stock')),
  };
};

export const setUploadedImageUrl = ({ form, fieldName = 'image', url }) => {
  if (form?.elements?.[fieldName]) {
    form.elements[fieldName].value = url;
  }
};
