export interface Birthday {
  id: number;
  firstName: string;
  lastName: string;
  nickName?: string;
  phoneNumber?: string;
  nameSavedInPhone?: string;
  dateOfBirth: string;
  language: string;
  relationType: string;
  sendAutomaticMessage: boolean;
  newAge: number;
}

export interface BirthdayWithMessage extends Birthday {
  message: string;
}
