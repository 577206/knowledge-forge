import * as XLSX from 'xlsx';
const rows = [
  ['姓名','部门','基础工资','出勤天数','绩效奖金','扣款','应发工资'],
  ['张三','门诊',5000,22,800,100,5700],
  ['李四','药房',4800,21,500,0,5300],
  ['王五','护理',5200,20,600,200,5600],
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, '工资表');
XLSX.writeFile(wb, 'test-fixtures/payroll-test.xlsx');
