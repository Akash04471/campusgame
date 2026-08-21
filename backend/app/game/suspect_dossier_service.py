"""
Suspect Dossier Engine
Compiles per-suspect case files for the Detective based on evidence, correlations, and movement traces.
"""
from typing import Dict, List, Optional


class SuspectDossierEngine:
    def build_dossier(
        self,
        room_code: str,
        player_ids: List[str],
        assignments: Dict[str, str],
        evidence_manager,
        cctv_engine,
        correlations: List[dict] = None,
        movement_traces: Dict[str, dict] = None,
    ) -> List[dict]:
        """
        Build compiled suspect case files for each suspect (all players except Detective).
        
        correlations: list of correlation result dicts from CORRELATE_EVIDENCE.
        movement_traces: dict mapping player_id -> list of visited area presence dicts from MOVEMENT_TRACE.
        """
        correlations = correlations or []
        movement_traces = movement_traces or {}

        detective_board_data = evidence_manager.get_detective_board(room_code)
        if isinstance(detective_board_data, dict):
            detective_board = detective_board_data.get('board', [])
        elif isinstance(detective_board_data, list):
            detective_board = detective_board_data
        else:
            detective_board = []

        dossiers = []

        for pid in player_ids:
            pid_str = str(pid)
            role = assignments.get(pid_str)
            if role == 'DETECTIVE':
                continue

            # 1. Filter board evidence pointing to this player
            implicated_items = [
                e for e in detective_board
                if isinstance(e, dict) and str(e.get('points_to_player_id')) == pid_str
            ]

            evidence_count = len(implicated_items)
            if evidence_count > 0:
                total_rel = sum(e.get('reliability_score', 0.5) for e in implicated_items)
                avg_reliability = round(total_rel / evidence_count, 2)
                areas_implicated = list(dict.fromkeys(
                    e.get('area') or e.get('area_found') for e in implicated_items if e.get('area') or e.get('area_found')
                ))
            else:
                avg_reliability = 0.0
                areas_implicated = []

            # 2. Correlation bonus
            correlation_bonus_sum = 0.0
            for corr in correlations:
                if str(corr.get('target_player_id')) == pid_str and corr.get('correlated') is True:
                    strength = corr.get('correlation_strength', 0.5)
                    correlation_bonus_sum += strength * 0.5

            # 3. Suspicion Score (0-100)
            base_score = (evidence_count * avg_reliability * 15) + correlation_bonus_sum
            suspicion_score = round(min(100.0, max(0.0, base_score)))

            # 4. Movement trace
            visited_areas = movement_traces.get(pid_str, [])

            # 5. Top 3 evidence IDs by reliability score
            sorted_items = sorted(implicated_items, key=lambda x: x.get('reliability_score', 0.5), reverse=True)
            top_evidence_ids = [e.get('evidence_id') for e in sorted_items[:3]]

            dossiers.append({
                'player_id': pid_str,
                'suspicion_score': suspicion_score,
                'evidence_count': evidence_count,
                'avg_reliability': avg_reliability,
                'areas_implicated': areas_implicated,
                'visited_areas': visited_areas,
                'top_evidence_ids': top_evidence_ids,
            })

        # Sort by suspicion_score descending
        dossiers.sort(key=lambda d: d['suspicion_score'], reverse=True)
        return dossiers


suspect_dossier_engine = SuspectDossierEngine()
