from pydantic import BaseModel

class VendorApplicationCreate(BaseModel):
    company_name: str
    entity_type: str
    custom_entity: str | None = None
    country: str = "India"
    pincode: str
    state: str
    district: str
    post_office: str | None = None
    address_building: str | None = None
    address_street: str | None = None
    pan_number: str
    gst_registered: str
    gstin: str | None = None
    bank_holder_name: str
    bank_name: str
    acc_number: str
    ifsc_code: str