import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class PersonalInfoDTO {
    @IsOptional()
    @IsNumber()
    id: number;
    @MaxLength(127)
    @IsString()
    label: string;
    @IsString()
    @MaxLength(31)
    type: string;
    @MaxLength(255)
    @IsString()
    value: string;
    @MaxLength(31)
    @IsNotEmpty()
    @IsString()
    lsid: string;
}