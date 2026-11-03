import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import './Profile.css';
import Swal from 'sweetalert2';
import { MdEdit } from 'react-icons/md';
import { getProfile, updateProfile } from '../services/vendorApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GST_STATE_CODES, getGstStateCode } from '../data/gstStateCodes';

const profileSchema = z.object({
  name: z.string().min(3, 'Contact Person must be at least 3 characters'),
  businessName: z.string().min(3, 'Business name must be at least 3 characters'),
  mobile: z.string().optional(),
  email: z.string().optional(),
  gstNumber: z.string().length(15, 'GST number must be exactly 15 characters'),
  gstStateCode: z.string().optional(),
  address: z.string().min(3, 'Address must be at least 3 characters'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional().or(z.literal('')),
  businessDescription: z.string().optional().or(z.literal(''))
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalName, setOriginalName] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      businessName: '',
      mobile: '',
      email: '',
      gstNumber: '',
      gstStateCode: '37',
      address: '',
      pincode: '',
      businessDescription: ''
    }
  });

  const selectedStateCode = watch('gstStateCode') || '37';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const data = res?.data || res;
        setOriginalName(data.business_name || 'Business Name');
        const gstNum = data.gst_number || '';
        const stateCode = data.gst_state_code || getGstStateCode(gstNum) || '37';
        reset({
          name: data.full_name || '',
          businessName: data.business_name || '',
          email: data.email || '',
          mobile: data.mobile || '',
          gstNumber: gstNum,
          gstStateCode: stateCode,
          address: data.address || '',
          pincode: data.pincode || '',
          businessDescription: data.business_description || ''
        });
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true);
    try {
      const stateCode = data.gstStateCode || (data.gstNumber ? data.gstNumber.slice(0, 2) : '37');
      await updateProfile({
        full_name: data.name,
        business_name: data.businessName,
        gst_number: data.gstNumber,
        gst_state_code: stateCode,
        address: data.address,
        pincode: data.pincode,
        business_description: data.businessDescription
      } as any);
      setOriginalName(data.businessName);
      Swal.fire({
        icon: 'success',
        title: 'Profile Saved!',
        text: 'Your business profile has been updated successfully.',
        timer: 1500,
        showConfirmButton: false
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to save profile', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error?.response?.data?.message || 'There was an issue saving your profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = async () => {
    setIsEditing(false);
    // Refetch to clear un-saved changes
    try {
      const res = await getProfile();
      const data = res?.data || res;
      reset({
        name: data.full_name || '',
        businessName: data.business_name || '',
        email: data.email || '',
        mobile: data.mobile || '',
        gstNumber: data.gst_number || '',
        address: data.address || '',
        pincode: data.pincode || '',
        businessDescription: data.business_description || ''
      });
    } catch (error) {
      console.error('Failed to refetch profile on cancel', error);
    }
  };

  if (loading) {
    return (
      <div className="page-container relative-container d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Loading />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="page-title mb-0">Business Profile</h2>
          {!isEditing && (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setIsEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}
            >
              <MdEdit size={16} /> Edit Profile
            </button>
          )}
        </div>

        <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-body p-4">
            <h4 className="mb-4">{originalName}</h4>

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="none">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Contact Person</label>
                  <input type="text" autoComplete="none"
                    className={`form-control ${errors.name ? 'input-error' : ''}`}
                    {...register('name')}
                    readOnly={!isEditing}
                  />
                  {errors.name && <span className="error-text">{errors.name.message}</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Business Name</label>
                  <input type="text" autoComplete="none"
                    className={`form-control ${errors.businessName ? 'input-error' : ''}`}
                    {...register('businessName')}
                    readOnly={!isEditing}
                  />
                  {errors.businessName && <span className="error-text">{errors.businessName.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Mobile Number</label>
                  <input type="text" autoComplete="none"
                    className="form-control"
                    {...register('mobile')}
                    readOnly
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Email Address</label>
                  <input type="email" autoComplete="none"
                    className="form-control"
                    {...register('email')}
                    readOnly
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">GST State Code</label>
                  <select
                    className="form-control"
                    value={selectedStateCode}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setValue('gstStateCode', newCode);
                      const currentGst = watch('gstNumber') || '';
                      if (!currentGst) {
                        setValue('gstNumber', newCode);
                      } else if (currentGst.length >= 2) {
                        setValue('gstNumber', newCode + currentGst.slice(2));
                      }
                    }}
                  >
                    {GST_STATE_CODES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">GST Number</label>
                  <input type="text" autoComplete="none"
                    className={`form-control text-uppercase ${errors.gstNumber ? 'input-error' : ''}`}
                    {...register('gstNumber', {
                      onChange: (e) => {
                        const val = e.target.value.toUpperCase();
                        if (val.length >= 2) {
                          const detected = getGstStateCode(val.slice(0, 2));
                          if (detected) setValue('gstStateCode', detected);
                        }
                      }
                    })}
                    readOnly={!isEditing}
                  />
                  {errors.gstNumber && <span className="error-text">{errors.gstNumber.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Pincode</label>
                  <input type="text" autoComplete="none"
                    className={`form-control ${errors.pincode ? 'input-error' : ''}`}
                    {...register('pincode')}
                    readOnly={!isEditing}
                  />
                  {errors.pincode && <span className="error-text">{errors.pincode.message}</span>}
                </div>

                <div style={{ gridColumn: "span 2", display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Business Address</label>
                  <input type="text" autoComplete="none"
                    className={`form-control ${errors.address ? 'input-error' : ''}`}
                    {...register('address')}
                    readOnly={!isEditing}
                  />
                  {errors.address && <span className="error-text">{errors.address.message}</span>}
                </div>

                <div style={{ gridColumn: "span 2", display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label fw-medium mb-1">Business Description</label>
                  <textarea
                    className={`form-control ${errors.businessDescription ? 'input-error' : ''}`}
                    {...register('businessDescription')}
                    readOnly={!isEditing}
                    rows={3}
                    style={{ resize: 'none' }}
                  />
                  {errors.businessDescription && <span className="error-text">{errors.businessDescription.message}</span>}
                </div>
              </div>

              {isEditing && (
                <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                  <button 
                    type="button" 
                    className="btn btn-light" 
                    onClick={cancelEdit}
                    disabled={saving}
                    style={{ padding: '8px 24px', borderRadius: '8px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ padding: '8px 24px', borderRadius: '8px' }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
