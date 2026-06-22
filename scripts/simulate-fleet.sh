#!/bin/bash
API="http://localhost:3000"
SECRET="dev-webhook-secret-123"
D=1000

echo "═══════════════════════════════════════════"
echo "  SIMULACION DE FLOTA — 40 UNIDADES"
echo "═══════════════════════════════════════════"

s() {
  D=$((D + 1))
  R=$(curl -s -X POST "$API/api/webhooks/crm/inbound" -H "Content-Type: application/json" -H "x-api-key: $SECRET" -d "$1")
  F=$(echo "$R" | grep -o '"folio":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  $2 $3 ($4) -> ${F:-OK}"
}

CO=',"crm_source":"hubspot","company_name":"Transportes Rapidos del Centro SA de CV","company_rfc":"TRC200815LA5","company_phone":"+524491234567","company_email":"operaciones@transportesrapidos.mx","company_address":"Parque Industrial Aguascalientes","contact_name":"Ing. Roberto Medina Flores","contact_email":"rmedina@transportesrapidos.mx","sales_rep_name":"Andrea Gutierrez"'

echo ""; echo "Hino 500 Series:"
s '{"external_crm_deal_id":"deal-1001"'$CO',"vehicle_brand":"Hino","vehicle_model":"500 Series 1126","vehicle_year":2022,"vehicle_engine":"J08E 7.7L","vehicle_vin":"JHDGH1JL8NXX00101","vehicle_internal_number":"TRC-001","vehicle_mileage":87500,"vehicle_engine_hours":3200,"requested_service_type":"Diagnostico DPF + SCR"}' Hino "500 1126" TRC-001
s '{"external_crm_deal_id":"deal-1002"'$CO',"vehicle_brand":"Hino","vehicle_model":"500 Series 1126","vehicle_year":2023,"vehicle_engine":"J08E 7.7L","vehicle_vin":"JHDGH1JL8NXX00102","vehicle_internal_number":"TRC-002","vehicle_mileage":45200,"vehicle_engine_hours":1800,"requested_service_type":"Preventivo"}' Hino "500 1126" TRC-002
s '{"external_crm_deal_id":"deal-1003"'$CO',"vehicle_brand":"Hino","vehicle_model":"500 Series 816","vehicle_year":2021,"vehicle_engine":"J05E 5.1L","vehicle_vin":"JHDGH1JL8NXX00103","vehicle_internal_number":"TRC-003","vehicle_mileage":125000,"vehicle_engine_hours":5100,"requested_service_type":"DPF + EGR"}' Hino "500 816" TRC-003
s '{"external_crm_deal_id":"deal-1004"'$CO',"vehicle_brand":"Hino","vehicle_model":"500 Series 1126","vehicle_year":2022,"vehicle_engine":"J08E 7.7L","vehicle_vin":"JHDGH1JL8NXX00104","vehicle_internal_number":"TRC-004","vehicle_mileage":92000,"vehicle_engine_hours":3800,"requested_service_type":"Diagnostico"}' Hino "500 1126" TRC-004
s '{"external_crm_deal_id":"deal-1005"'$CO',"vehicle_brand":"Hino","vehicle_model":"500 Series 1526","vehicle_year":2020,"vehicle_engine":"J08E 7.7L","vehicle_vin":"JHDGH1JL8NXX00105","vehicle_internal_number":"TRC-005","vehicle_mileage":168000,"vehicle_engine_hours":6500,"requested_service_type":"DPF regeneracion fallida","commercial_notes":"URGENTE derate activo"}' Hino "500 1526" TRC-005

echo ""; echo "Isuzu ELF:"
s '{"external_crm_deal_id":"deal-1006"'$CO',"vehicle_brand":"Isuzu","vehicle_model":"ELF 300","vehicle_year":2023,"vehicle_engine":"4JJ3 3.0L","vehicle_vin":"JASELF300NXX00106","vehicle_internal_number":"TRC-006","vehicle_mileage":32000,"vehicle_engine_hours":1200,"requested_service_type":"Preventivo"}' Isuzu "ELF 300" TRC-006
s '{"external_crm_deal_id":"deal-1007"'$CO',"vehicle_brand":"Isuzu","vehicle_model":"ELF 300","vehicle_year":2022,"vehicle_engine":"4JJ3 3.0L","vehicle_vin":"JASELF300NXX00107","vehicle_internal_number":"TRC-007","vehicle_mileage":78000,"vehicle_engine_hours":2900,"requested_service_type":"SCR sensor falla"}' Isuzu "ELF 300" TRC-007
s '{"external_crm_deal_id":"deal-1008"'$CO',"vehicle_brand":"Isuzu","vehicle_model":"ELF 400","vehicle_year":2021,"vehicle_engine":"4HK1 5.2L","vehicle_vin":"JASELF400NXX00108","vehicle_internal_number":"TRC-008","vehicle_mileage":112000,"vehicle_engine_hours":4500,"requested_service_type":"DPF + SCR"}' Isuzu "ELF 400" TRC-008
s '{"external_crm_deal_id":"deal-1009"'$CO',"vehicle_brand":"Isuzu","vehicle_model":"ELF 300","vehicle_year":2023,"vehicle_engine":"4JJ3 3.0L","vehicle_vin":"JASELF300NXX00109","vehicle_internal_number":"TRC-009","vehicle_mileage":18000,"vehicle_engine_hours":750,"requested_service_type":"Preventivo"}' Isuzu "ELF 300" TRC-009
s '{"external_crm_deal_id":"deal-1010"'$CO',"vehicle_brand":"Isuzu","vehicle_model":"ELF 600","vehicle_year":2020,"vehicle_engine":"4HK1 5.2L","vehicle_vin":"JASELF600NXX00110","vehicle_internal_number":"TRC-010","vehicle_mileage":145000,"vehicle_engine_hours":5800,"requested_service_type":"EGR obstruido"}' Isuzu "ELF 600" TRC-010

echo ""; echo "Ford Transit:"
for i in 11 12 13 14 15 16; do
  s '{"external_crm_deal_id":"deal-10'$i'"'$CO',"vehicle_brand":"Ford","vehicle_model":"Transit 350 HD","vehicle_year":202'$((i%4))',"vehicle_engine":"3.2L Power Stroke","vehicle_vin":"1FTYR2XM'$i'NXX0'$i'","vehicle_internal_number":"TRC-0'$i'","vehicle_mileage":'$((40000+i*7000))',"vehicle_engine_hours":'$((1500+i*300))',"requested_service_type":"Diagnostico post-tratamiento"}' Ford "Transit 350" TRC-0$i
done

echo ""; echo "Mercedes-Benz Sprinter:"
for i in 17 18 19 20 21 22; do
  s '{"external_crm_deal_id":"deal-10'$i'"'$CO',"vehicle_brand":"Mercedes-Benz","vehicle_model":"Sprinter 516 CDI","vehicle_year":202'$((i%4))',"vehicle_engine":"OM654 2.0L Turbo","vehicle_vin":"WDB90766'$i'XX0'$i'","vehicle_internal_number":"TRC-0'$i'","vehicle_mileage":'$((35000+i*6000))',"vehicle_engine_hours":'$((1200+i*280))',"requested_service_type":"Preventivo"}' MB "Sprinter 516" TRC-0$i
done

echo ""; echo "Varios ultima milla:"
s '{"external_crm_deal_id":"deal-1023"'$CO',"vehicle_brand":"Volkswagen","vehicle_model":"Crafter 50 TDI","vehicle_year":2022,"vehicle_engine":"2.0L TDI","vehicle_vin":"WV1ZZZ2KZN0X00123","vehicle_internal_number":"TRC-023","vehicle_mileage":67000,"vehicle_engine_hours":2600,"requested_service_type":"DPF diagnostico"}' VW "Crafter 50" TRC-023
s '{"external_crm_deal_id":"deal-1024"'$CO',"vehicle_brand":"MAN","vehicle_model":"TGE 5.180","vehicle_year":2023,"vehicle_engine":"2.0L TDI","vehicle_vin":"WMANXXTTE0N000124","vehicle_internal_number":"TRC-024","vehicle_mileage":28000,"vehicle_engine_hours":1100,"requested_service_type":"Preventivo"}' MAN "TGE 5.180" TRC-024
s '{"external_crm_deal_id":"deal-1025"'$CO',"vehicle_brand":"Iveco","vehicle_model":"Daily 70C","vehicle_year":2021,"vehicle_engine":"F1C 3.0L","vehicle_vin":"ZCFC270C005000125","vehicle_internal_number":"TRC-025","vehicle_mileage":98000,"vehicle_engine_hours":3900,"requested_service_type":"SCR + DPF"}' Iveco "Daily 70C" TRC-025

echo ""; echo "Tractocamiones Kenworth:"
s '{"external_crm_deal_id":"deal-1026"'$CO',"vehicle_brand":"Kenworth","vehicle_model":"T680","vehicle_year":2022,"vehicle_engine":"Paccar MX-13 12.9L","vehicle_vin":"1XKAD49X8NJ100126","vehicle_internal_number":"TRC-026","vehicle_mileage":320000,"vehicle_engine_hours":11500,"requested_service_type":"DPF+SCR+EGR completo","commercial_notes":"Derate activo unidad parada"}' Kenworth T680 TRC-026
s '{"external_crm_deal_id":"deal-1027"'$CO',"vehicle_brand":"Kenworth","vehicle_model":"T680","vehicle_year":2021,"vehicle_engine":"Paccar MX-13 12.9L","vehicle_vin":"1XKAD49X8NJ100127","vehicle_internal_number":"TRC-027","vehicle_mileage":415000,"vehicle_engine_hours":15200,"requested_service_type":"Diagnostico completo"}' Kenworth T680 TRC-027
s '{"external_crm_deal_id":"deal-1028"'$CO',"vehicle_brand":"Kenworth","vehicle_model":"T880","vehicle_year":2023,"vehicle_engine":"Paccar MX-13 12.9L","vehicle_vin":"1XKAD49X8NJ100128","vehicle_internal_number":"TRC-028","vehicle_mileage":180000,"vehicle_engine_hours":6800,"requested_service_type":"Preventivo"}' Kenworth T880 TRC-028

echo ""; echo "Tractocamiones Freightliner:"
s '{"external_crm_deal_id":"deal-1029"'$CO',"vehicle_brand":"Freightliner","vehicle_model":"Cascadia","vehicle_year":2022,"vehicle_engine":"Detroit DD15 14.8L","vehicle_vin":"3AKJGLDR8MSX00129","vehicle_internal_number":"TRC-029","vehicle_mileage":290000,"vehicle_engine_hours":10800,"requested_service_type":"DPF critico + SCR","commercial_notes":"Regeneracion fallida"}' Freightliner Cascadia TRC-029
s '{"external_crm_deal_id":"deal-1030"'$CO',"vehicle_brand":"Freightliner","vehicle_model":"Cascadia","vehicle_year":2021,"vehicle_engine":"Detroit DD15 14.8L","vehicle_vin":"3AKJGLDR8MSX00130","vehicle_internal_number":"TRC-030","vehicle_mileage":380000,"vehicle_engine_hours":14000,"requested_service_type":"DPF + EGR completo"}' Freightliner Cascadia TRC-030
s '{"external_crm_deal_id":"deal-1031"'$CO',"vehicle_brand":"Freightliner","vehicle_model":"Cascadia","vehicle_year":2023,"vehicle_engine":"Detroit DD13 12.8L","vehicle_vin":"3AKJGLDR8MSX00131","vehicle_internal_number":"TRC-031","vehicle_mileage":145000,"vehicle_engine_hours":5500,"requested_service_type":"Preventivo"}' Freightliner Cascadia TRC-031
s '{"external_crm_deal_id":"deal-1032"'$CO',"vehicle_brand":"Freightliner","vehicle_model":"M2 106","vehicle_year":2022,"vehicle_engine":"Cummins ISB 6.7L","vehicle_vin":"1FVACXDT3NHX00132","vehicle_internal_number":"TRC-032","vehicle_mileage":95000,"vehicle_engine_hours":3800,"requested_service_type":"SCR sensor"}' Freightliner "M2 106" TRC-032

echo ""; echo "International:"
s '{"external_crm_deal_id":"deal-1033"'$CO',"vehicle_brand":"International","vehicle_model":"LT625","vehicle_year":2022,"vehicle_engine":"Cummins X15 14.9L","vehicle_vin":"3HSDZSJR8NN000133","vehicle_internal_number":"TRC-033","vehicle_mileage":265000,"vehicle_engine_hours":9800,"requested_service_type":"DPF + SCR"}' International LT625 TRC-033
s '{"external_crm_deal_id":"deal-1034"'$CO',"vehicle_brand":"International","vehicle_model":"LT625","vehicle_year":2021,"vehicle_engine":"Cummins X15 14.9L","vehicle_vin":"3HSDZSJR8NN000134","vehicle_internal_number":"TRC-034","vehicle_mileage":352000,"vehicle_engine_hours":13000,"requested_service_type":"EGR+DPF critico","commercial_notes":"Limitacion potencia"}' International LT625 TRC-034

echo ""; echo "Unidades adicionales:"
for i in 35 36 37 38 39 40; do
  BRANDS=("Hino" "Isuzu" "Ford" "Mercedes-Benz" "Isuzu" "Hino")
  MODELS=("500 Series 1126" "ELF 300" "Transit 350 HD" "Sprinter 516 CDI" "ELF 400" "500 Series 816")
  ENGS=("J08E 7.7L" "4JJ3 3.0L" "3.2L Power Stroke" "OM654 2.0L" "4HK1 5.2L" "J05E 5.1L")
  IDX=$(( (i - 35) % 6 ))
  s '{"external_crm_deal_id":"deal-10'$i'"'$CO',"vehicle_brand":"'${BRANDS[$IDX]}'","vehicle_model":"'${MODELS[$IDX]}'","vehicle_year":202'$((i%4))',"vehicle_engine":"'${ENGS[$IDX]}'","vehicle_vin":"SIMVIN0000000'$i'","vehicle_internal_number":"TRC-0'$i'","vehicle_mileage":'$((50000+i*2500))',"vehicle_engine_hours":'$((2000+i*100))',"requested_service_type":"Preventivo"}' "${BRANDS[$IDX]}" "${MODELS[$IDX]}" TRC-0$i
done

echo ""
echo "═══════════════════════════════════════════"
echo "  WEBHOOKS COMPLETADOS"
echo "═══════════════════════════════════════════"
echo ""
echo "Ahora ejecuta:"
echo "  npx tsx scripts/seed-diagnostics.ts"
