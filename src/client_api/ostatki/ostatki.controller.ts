import { Body, Controller } from '@nestjs/common';
import { OstatkiService } from './ostatki.service';
import { Get, Headers, Query, Post } from '@nestjs/common';


@Controller('client_api/ostatki')
export class OstatkiController {
    constructor(private readonly ostatkiService: OstatkiService) {}

    @Get('get_sku_by_sku_id')
    async getSkuBySkuId(@Headers() headers, @Query('sku_id') skuId: number) {
        const tokenCheckResult = await this.ostatkiService.checkToken(headers);
        if (tokenCheckResult.status !== 'valid') {
            return tokenCheckResult;
        }
        return this.ostatkiService.getSkuBySkuId(skuId);
    }
     
    @Post('get_skus_by_sku_ids')
    async getSkusBySkuIds(@Headers() headers, @Body() body: { sku_ids: number[] }) {
        const tokenCheckResult = await this.ostatkiService.checkToken(headers);
        if (tokenCheckResult.status !== 'valid') {
            return tokenCheckResult;
        }
        //use this.ostatkiService.getSkusBySkuIds(body.sku_ids) to get the skus by sku ids
        return this.ostatkiService.getSkusBySkuIds(body.sku_ids);
    }

    @Get('reg_list')
    async getRegList(@Headers() headers) {
        const tokenCheckResult = await this.ostatkiService.checkToken(headers);
        if (tokenCheckResult.status !== 'valid') {
            return tokenCheckResult;
        }
        return this.ostatkiService.getRegList();
    }

    @Get('fields_by_reg_id')
    async getFieldsByRegId(@Headers() headers, @Query('reg_id') regId: number) {
        const tokenCheckResult = await this.ostatkiService.checkToken(headers);
        if (tokenCheckResult.status !== 'valid') {
            return tokenCheckResult;
        }
        return this.ostatkiService.getFieldsByRegId(regId);
    }

    @Post('post_stock')
    async postStock(@Headers() headers, @Body() body: { address: number, sku_id: string, value: number, date: string }[]) {
        const tokenCheckResult = await this.ostatkiService.checkToken(headers);
        if (tokenCheckResult.status !== 'valid') {
            return tokenCheckResult;
        }
        
        return this.ostatkiService.postStock(body);
    }
}