/**
 * 企業マスタのエンティティ（集約ルート）。
 *
 * 出典は EDINET コードリスト（金融庁）。有価証券報告書の提出会社なので、
 * 上場企業と主要な未上場企業は網羅するが、日本の全法人ではない。
 * マスタに無い企業でも面接練習はできる（InterviewSession.companyName は
 * 自由入力を保持し、companyId が null のまま成立する）という前提で設計している。
 */
export type Company = {
  id: string;
  /** EDINET コード。取り込みの一意キー。 */
  edinetCode: string | null;
  /** 法人番号（13 桁）。商号変更などで複数コードが同じ番号を持つため一意ではない。 */
  corporateNumber: string | null;
  /** 表示用の正式名称。 */
  name: string;
  nameKana: string | null;
  /** 4 桁の証券コード。非上場なら null。 */
  securitiesCode: string | null;
  isListed: boolean;
  /** 提出者業種（EDINET の区分。33 業種相当）。 */
  industryLabel: string | null;
  /**
   * 資本金（百万円）。不明なら null。
   * 表示には使わず、候補の並び順で企業の規模を測る手がかりにする。
   */
  capitalMillionYen: number | null;
};
